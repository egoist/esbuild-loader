import { transform as defaultEsbuildTransform } from 'esbuild';
import { RawSource, SourceMapSource } from 'webpack-sources';
import webpack from 'webpack';
import { matchObject } from 'webpack/lib/ModuleFilenameHelpers.js';
import { MinifyPluginOptions } from './interfaces';

type Asset = webpack.compilation.Asset;

type KnownStatsPrinterContext = {
	formatFlag(flag: string): string;
	green(string: string): string;
};

type Tappable = {
	tap(
		name: string,
		callback: (
			minimized: boolean,
			statsPrinterContext: KnownStatsPrinterContext,
		) => void,
	): void;
};

type StatsPrinter = {
	hooks: {
		print: {
			for(name: string): Tappable;
		};
	};
};

type Compilation = webpack.compilation.Compilation;

type Wp5Compilation = Compilation & {
	hooks: Compilation['hooks'] & {
		processAssets: Compilation['hooks']['optimizeAssets'];
		statsPrinter: Compilation['hooks']['childCompiler']; // Could be any SyncHook
	};
	constructor: {
		PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: 400;
	};
};

const isWebpack5 = (compilation: Compilation): compilation is Wp5Compilation => ('processAssets' in compilation.hooks);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json');

const isJsFile = /\.[cm]?js(\?.*)?$/i;
const isCssFile = /\.css(\?.*)?$/i;
const pluginName = 'esbuild-minify';

const granularMinifyConfigs = ['minifyIdentifiers', 'minifySyntax', 'minifyWhitespace'] as const;
class ESBuildMinifyPlugin {
	private readonly options: MinifyPluginOptions;

	private readonly transform: typeof defaultEsbuildTransform;

	constructor(options: MinifyPluginOptions = {}) {
		const { implementation } = options;
		if (implementation && typeof implementation.transform !== 'function') {
			throw new TypeError(
				`ESBuildMinifyPlugin: implementation.transform must be an ESBuild transform function. Received ${typeof implementation.transform}`,
			);
		}

		this.transform = implementation?.transform ?? defaultEsbuildTransform;

		this.options = { ...options };

		const hasGranularMinificationConfig = granularMinifyConfigs.some(
			minifyConfig => minifyConfig in options,
		);

		if (!hasGranularMinificationConfig) {
			this.options.minify = true;
		}
	}

	apply(compiler: webpack.Compiler): void {
		compiler.hooks.compilation.tap(pluginName, (compilation) => {
			const meta = JSON.stringify({
				name: 'esbuild-loader',
				version,
				options: this.options,
			});

			compilation.hooks.chunkHash.tap(pluginName, (_, hash) => hash.update(meta));

			if (isWebpack5(compilation)) {
				compilation.hooks.processAssets.tapPromise(
					{
						name: pluginName,
						stage: compilation.constructor.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
						// @ts-expect-error TODO: modify type
						additionalAssets: true,
					},
					async () => await this.transformAssets(compilation),
				);

				compilation.hooks.statsPrinter.tap(pluginName, (statsPrinter: StatsPrinter) => {
					statsPrinter.hooks.print
						.for('asset.info.minimized')
						.tap(
							pluginName,
							(minimized, { green, formatFlag }: any) => (
								minimized
									? green(formatFlag('minimized'))
									: undefined
							),
						);
				});
			} else {
				compilation.hooks.optimizeChunkAssets.tapPromise(
					pluginName,
					async () => await this.transformAssets(compilation),
				);
			}
		});
	}

	async transformAssets(
		compilation: Compilation,
	): Promise<void> {
		const { options: { devtool } } = compilation.compiler;

		const sourcemap = (
			// TODO: drop support for esbuild sourcemap in future so it all goes through WP API
			// Might still be necessary when SourceMap plugin is used
			this.options.sourcemap === undefined
				? devtool && (devtool as string).includes('source-map')
				: this.options.sourcemap
		);

		const {
			css: minifyCss,
			include,
			exclude,
			implementation,
			...transformOptions
		} = this.options;

		const assets = (compilation.getAssets() as Asset[])

			// Filter out by file type
			.filter(asset => (
				isJsFile.test(asset.name)
				|| (
					minifyCss
					&& isCssFile.test(asset.name)
				)
			)
			&& matchObject({ include, exclude }, asset.name))

			// Filter out already minimized
			.filter(asset => !asset.info.minimized);

		await Promise.all(assets.map(async (asset) => {
			const assetIsCss = isCssFile.test(asset.name);
			const { source, map } = asset.source.sourceAndMap();
			const result = await this.transform(source.toString(), {
				...transformOptions,
				loader: (
					assetIsCss
						? 'css'
						: transformOptions.loader
				),
				sourcemap,
				sourcefile: asset.name,
			});

			compilation.updateAsset(
				asset.name,
				(
					sourcemap
					// CSS source-maps not supported yet https://github.com/evanw/esbuild/issues/519
					&& !assetIsCss
				)
					? new SourceMapSource(
						result.code || '',
						asset.name,
						result.map as any,
						source?.toString(),
						map!,
						true,
					)
					: new RawSource(result.code || ''),
				{
					...asset.info,
					minimized: true,
				},
			);
		}));
	}
}

export default ESBuildMinifyPlugin;
