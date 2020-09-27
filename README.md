# esbuild-loader <a href="https://npm.im/esbuild-loader"><img src="https://badgen.net/npm/v/esbuild-loader"></a> <a href="https://npm.im/esbuild-loader"><img src="https://badgen.net/npm/dm/esbuild-loader"></a> <a href="https://packagephobia.now.sh/result?p=esbuild-loader"><img src="https://packagephobia.now.sh/badge?p=esbuild-loader"></a>

Speed up your Webpack build with [esbuild](https://github.com/evanw/esbuild)! 🔥


[esbuild](https://github.com/evanw/esbuild) is written in Go, and supports blazing fast ESNext & TypeScript transpilation, and JS minification.


## 🚀 Install

```bash
npm i -D esbuild esbuild-loader
```

## 🚦 Quick Setup

### Javascript transpilation (eg. Babel)
In `webpack.config.js`:

```diff
+ const { ESBuildPlugin } = require('esbuild-loader')

  module.exports = {
    module: {
      rules: [
-       {
-         test: /\.js$/,
-         use: 'babel-loader',
-       },
+       {
+         test: /\.js$/,
+         loader: 'esbuild-loader',
+         options: {
+           target: 'es2015', // Syntax to compile to (see options below for possible values)
+         },
+       },

        ...
      ],
    },
    plugins: [
+     new ESBuildPlugin()
    ]
  }
```

### TypeScript & TSX
In `webpack.config.js`:

```diff
+ const { ESBuildPlugin } = require('esbuild-loader')

  module.exports = {
    module: {
      rules: [
-       {
-         test: /\.tsx?$/,
-         use: 'ts-loader',
-       },
+       {
+         test: /\.tsx?$/,
+         loader: 'esbuild-loader',
+         options: {
+           loader: 'tsx', // Or 'ts' if you don't need tsx
+           target: 'es2015',
+         },
+       },

        ...
      ],
    },
    plugins: [
+     new ESBuildPlugin()
    ]
  }
```

### Minification (eg. Terser)
You can replace JS minifiers like Terser or UglifyJs. Checkout the [benchmarks](https://github.com/privatenumber/minification-benchmarks) to see how much faster esbuild is.

In `webpack.config.js`:

```diff
+ const {
+   ESBuildPlugin,
+   ESBuildMinifyPlugin
+ } = require('esbuild-loader')

  module.exports = {
    ...,

+   optimization: {
+     minimize: true,
+     minimizer: [
+       new ESBuildMinifyPlugin()
+     ],
+   },

    plugins: [
+     new ESBuildPlugin()
    ]
  }
```

## ⚙️ Options

### Loader
The loader supports options from [esbuild](https://github.com/evanw/esbuild#command-line-usage).
- `target` `<String>` (`es2015`) - Environment target (e.g. es2017, chrome80, esnext)
- `loader` `<String>` (`js`) - Which loader to use to handle file
  - [Possible values](https://github.com/evanw/esbuild/blob/master/lib/types.ts#L3): `js`, `jsx`, `ts`, `tsx`, `json`, `text`, `base64`, `file`, `dataurl`, `binary`
- `jsxFactory` `<String>` - What to use instead of React.createElement
- `jsxFragment` `<String>` - What to use instead of React.Fragment

Enable source-maps via [`devtool`](https://webpack.js.org/configuration/devtool/)

### MinifyPlugin
- `minify` `<Boolean>` (`true`) - Sets all `--minify-*` flags
- `minifyWhitespace` `<Boolean>` - Remove whitespace
- `minifyIdentifiers` `<Boolean>` - Shorten identifiers
- `minifySyntax` `<Boolean>` - Use equivalent but shorter syntax
- `sourcemap` `<Boolean>` (defaults to Webpack `devtool`)- Whether to emit sourcemaps


## 💼 License
- MIT &copy; privatenumber
- MIT &copy; [EGOIST (Kevin Titor)](https://github.com/sponsors/egoist)
