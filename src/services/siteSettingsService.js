import api from "./api";


export async function getBrandingSettings() {

    const response =
        await api.get(
            "/site-settings/branding"
        );


    console.log(
        "Branding API response:",
        response
    );


    return (
        response?.branding ||
        {}
    );

}