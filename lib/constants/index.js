export const APP_NAME = process.env.APP_NAME || "YouWanto";
export const APP_DESCRIPTION = process.env.APP_DESCRIPTION || "Premium fashion from the brands you love, all in one place.";
export const SERVER_URL = process.env.SERVER_URL || "https://youwanto.com";
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