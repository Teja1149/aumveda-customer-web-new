
/* ============================================================
   AUMVEDA CUSTOMER WEB
   ADDRESS SERVICE — FASTAPI INTEGRATION
   STEP 17I.10F

   Customer Web -> Customer Backend -> Supabase

   No direct Supabase database operations.
   Uses authenticated Supabase session token.
   Preserves existing exported function signatures.
============================================================ */

import { supabase } from "./supabase";

/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE_URL = (
    import.meta.env.VITE_CUSTOMER_API_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000"
).replace(/\/+$/, "");

/*
   Supports either:
   VITE_CUSTOMER_API_URL=http://localhost:5000

   or:
   VITE_CUSTOMER_API_URL=http://localhost:5000/api/v1

   The backend must register addresses under /api/v1.
*/

const API_ROOT = /\/api\/v1$/.test(API_BASE_URL)
    ? API_BASE_URL
    : `${API_BASE_URL}/api/v1`;

const ADDRESSES_ENDPOINT = `${API_ROOT}/addresses`;

/* ============================================================
   GET AUTHENTICATION TOKEN
============================================================ */

async function getAccessToken() {
    const { data, error } =
        await supabase.auth.getSession();

    if (error) {
        console.error(
            "Unable to retrieve authentication session:",
            error
        );

        throw new Error(
            "Unable to verify your session. Please sign in again."
        );
    }

    const accessToken = data?.session?.access_token;

    if (!accessToken) {
        throw new Error(
            "Your session has expired. Please sign in again."
        );
    }

    return accessToken;
}

/* ============================================================
   API REQUEST HELPER
============================================================ */

async function addressApiRequest(
    endpoint,
    {
        method = "GET",
        body,
    } = {}
) {
    const accessToken = await getAccessToken();

    let response;

    try {
        response = await fetch(
            `${ADDRESSES_ENDPOINT}${endpoint}`,
            {
                method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json",
                    ...(body !== undefined
                        ? {
                            "Content-Type": "application/json",
                        }
                        : {}),
                },
                ...(body !== undefined
                    ? {
                        body: JSON.stringify(body),
                    }
                    : {}),
            }
        );
    } catch (error) {
        console.error(
            "Address API network error:",
            error
        );

        throw new Error(
            "Unable to connect to the Customer Backend. Please check that the server is running."
        );
    }

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (!response.ok) {
        let message =
            "Unable to complete the address request.";

        if (typeof result?.detail === "string") {
            message = result.detail;
        } else if (
            Array.isArray(result?.detail)
        ) {
            message = result.detail
                .map((item) => item?.msg || "Invalid field")
                .join(". ");
        } else if (
            typeof result?.message === "string"
        ) {
            message = result.message;
        }

        if (response.status === 401) {
            message =
                "Your session has expired. Please sign in again.";
        } else if (response.status === 403) {
            message =
                "You do not have permission to manage this address.";
        } else if (response.status === 404) {
            message = "Address not found.";
        }

        console.error(
            "Address API request failed:",
            {
                method,
                endpoint,
                status: response.status,
                message,
            }
        );

        throw new Error(message);
    }

    if (
        result?.status &&
        result.status !== "success"
    ) {
        throw new Error(
            result?.message ||
            "Address operation was unsuccessful."
        );
    }

    return result;
}

/* ============================================================
   HELPERS
============================================================ */

function cleanNullable(value) {
    const cleanValue = String(value ?? "").trim();

    return cleanValue || null;
}

function validateCustomerId(customerId) {
    if (!customerId) {
        throw new Error("Customer ID is required.");
    }
}

function validateAddress({
    recipientName,
    phone,
    addressLine1,
    city,
    state,
    postalCode,
}) {
    if (!recipientName?.trim()) {
        throw new Error(
            "Recipient name is required."
        );
    }

    if (!phone?.trim()) {
        throw new Error(
            "Phone number is required."
        );
    }

    if (
        !/^[0-9+\-\s()]{7,20}$/.test(
            phone.trim()
        )
    ) {
        throw new Error(
            "Please enter a valid phone number."
        );
    }

    if (!addressLine1?.trim()) {
        throw new Error(
            "Address line 1 is required."
        );
    }

    if (!city?.trim()) {
        throw new Error(
            "City is required."
        );
    }

    if (!state?.trim()) {
        throw new Error(
            "State is required."
        );
    }

    if (
        !/^[0-9]{6}$/.test(
            String(postalCode ?? "").trim()
        )
    ) {
        throw new Error(
            "Please enter a valid 6-digit PIN code."
        );
    }
}

function buildAddressPayload({
    label,
    recipientName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country = "India",
    isDefault = false,
}) {
    validateAddress({
        recipientName,
        phone,
        addressLine1,
        city,
        state,
        postalCode,
    });

    return {
        label: cleanNullable(label) || "Home",

        recipient_name: recipientName.trim(),

        phone: phone.trim(),

        address_line1: addressLine1.trim(),

        address_line2: cleanNullable(addressLine2),

        city: city.trim(),

        state: state.trim(),

        postal_code: postalCode.trim(),

        country: cleanNullable(country) || "India",

        is_default: Boolean(isDefault),
    };
}

/* ============================================================
   1. GET CUSTOMER ADDRESSES
============================================================ */

export async function getCustomerAddresses(
    customerId
) {
    validateCustomerId(customerId);

    try {
        const result = await addressApiRequest("");

        return Array.isArray(result?.data)
            ? result.data
            : [];
    } catch (error) {
        console.error(
            "Customer addresses loading failed:",
            error
        );

        throw error;
    }
}

/* ============================================================
   2. CREATE CUSTOMER ADDRESS
============================================================ */

export async function createCustomerAddress({
    customerId,
    label,
    recipientName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country = "India",
    isDefault = false,
}) {
    validateCustomerId(customerId);

    const payload = buildAddressPayload({
        label,
        recipientName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        isDefault,
    });

    try {
        const result = await addressApiRequest(
            "",
            {
                method: "POST",
                body: payload,
            }
        );

        if (!result?.data) {
            throw new Error(
                "The backend did not return the created address."
            );
        }

        return result.data;
    } catch (error) {
        console.error(
            "Address creation failed:",
            error
        );

        throw error;
    }
}

/* ============================================================
   3. UPDATE CUSTOMER ADDRESS
============================================================ */

export async function updateCustomerAddress({
    addressId,
    customerId,
    label,
    recipientName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country = "India",
    isDefault = false,
}) {
    if (!addressId || !customerId) {
        throw new Error(
            "Address information is missing."
        );
    }

    const payload = buildAddressPayload({
        label,
        recipientName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        isDefault,
    });

    try {
        const result = await addressApiRequest(
            `/${encodeURIComponent(addressId)}`,
            {
                method: "PATCH",
                body: payload,
            }
        );

        if (!result?.data) {
            throw new Error(
                "The backend did not return the updated address."
            );
        }

        return result.data;
    } catch (error) {
        console.error(
            "Address update failed:",
            error
        );

        throw error;
    }
}

/* ============================================================
   4. DELETE CUSTOMER ADDRESS
============================================================ */

export async function deleteCustomerAddress(
    addressId,
    customerId
) {
    if (!addressId || !customerId) {
        throw new Error(
            "Address information is missing."
        );
    }

    try {
        await addressApiRequest(
            `/${encodeURIComponent(addressId)}`,
            {
                method: "DELETE",
            }
        );

        return true;
    } catch (error) {
        console.error(
            "Address deletion failed:",
            error
        );

        throw error;
    }
}

/* ============================================================
   5. SET DEFAULT ADDRESS
============================================================ */

export async function setDefaultAddress(
    addressId,
    customerId
) {
    if (!addressId || !customerId) {
        throw new Error(
            "Address information is missing."
        );
    }

    try {
        const result = await addressApiRequest(
            `/${encodeURIComponent(addressId)}/default`,
            {
                method: "PATCH",
            }
        );

        if (!result?.data) {
            throw new Error(
                "The backend did not return the default address."
            );
        }

        return result.data;
    } catch (error) {
        console.error(
            "Setting default address failed:",
            error
        );

        throw error;
    }
}
