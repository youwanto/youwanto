export const APP_NAME = process.env.APP_NAME || "My Shop";
export const APP_DESCRIPTION = process.env.APP_DESCRIPTION || "The best shop for all your needs";
export const SERVER_URL = process.env.SERVER_URL || "http://www.youwanto.com";
export const LATEST_PRODUCTS_LIMIT = Number(process.env.LATEST_PRODUCTS_LIMIT) || 4;
export const SIGNIN_DEFAULT_VALUES = {
    email: "",
    password: "",
};
export const SIGNUP_DEFAULT_VALUES = {
    name: "Meme",
    email: "meme@myshop.com",
    password: "",
    confirmPassword: "",
};