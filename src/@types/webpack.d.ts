declare module 'webpack/lib/ModuleFilenameHelpers' {
	type Filter = string | RegExp;
	type FilterObject = {
		include?: Filter | Filter[];
		exclude?: Filter | Filter[];
	};

	export const matchObject: (filterObject: FilterObject, stringToCheck: string) => boolean;
}