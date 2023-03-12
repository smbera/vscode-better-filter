let latestSearch: string = '';

export const setLatestSearch = (val: string) => {
	latestSearch = val;
};

export const getLatestSearch = () => {
	return latestSearch;
};
