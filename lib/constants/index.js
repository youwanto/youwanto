export const APP_NAME = process.env.APP_NAME || "YouWanto";
export const APP_DESCRIPTION = process.env.APP_DESCRIPTION || "Premium fashion from the brands you love, all in one place.";
// Public address of the site, used for canonical URLs, the sitemap and robots.txt.
// Anything but a local address is forced to https and reduced to its origin, so a mistyped
// environment variable ("http://...", trailing slash) cannot leak into search engines.
const DEFAULT_SERVER_URL = "https://www.youwanto.com";
const normalizeServerUrl = (value) => {
    try {
        const url = new URL(value);
        const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
        if (!isLocal) url.protocol = "https:";
        return url.origin;
    } catch {
        return DEFAULT_SERVER_URL;
    }
};
export const SERVER_URL = normalizeServerUrl(process.env.SERVER_URL || DEFAULT_SERVER_URL);
export const LATEST_PRODUCTS_LIMIT = Number(process.env.LATEST_PRODUCTS_LIMIT) || 4;
export const HOME_FEED_PAGE_SIZE = 24;
export const SIGNIN_DEFAULT_VALUES = {
    email: "",
    password: "",
};
export const SIGNUP_DEFAULT_VALUES = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
};

// Cart pricing rules
export const TAX_RATE = Number(process.env.TAX_RATE ?? 0.15);
export const SHIPPING_PRICE = Number(process.env.SHIPPING_PRICE ?? 10);
export const FREE_SHIPPING_THRESHOLD = Number(process.env.FREE_SHIPPING_THRESHOLD ?? 100);