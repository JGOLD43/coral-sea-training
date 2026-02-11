/**
 * Acuity Scheduling API Client
 * Thin wrapper for HTTP Basic Auth calls to Acuity's REST API
 */

const fetch = require('node-fetch');
const functions = require('firebase-functions');

const BASE_URL = 'https://acuityscheduling.com/api/v1';

function getAuthHeader() {
    const userId = functions.config().acuity.user_id;
    const apiKey = functions.config().acuity.api_key;
    return 'Basic ' + Buffer.from(userId + ':' + apiKey).toString('base64');
}

async function acuityRequest(method, path, { params, body } = {}) {
    const url = new URL(BASE_URL + path);

    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                url.searchParams.set(k, v);
            }
        });
    }

    const options = {
        method,
        headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }

    // 15-second timeout to prevent Cloud Function from hanging on slow responses
    const AbortController = globalThis.AbortController || require('abort-controller');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    options.signal = controller.signal;

    let response;
    try {
        response = await fetch(url.toString(), options);
    } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
            const err = new Error('Scheduling service timed out');
            err.status = 504;
            throw err;
        }
        throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
        // Log full error server-side, but don't leak Acuity details to callers
        const errorBody = await response.text();
        functions.logger.error('Acuity API error:', { status: response.status, body: errorBody });
        const err = new Error('Scheduling service error');
        err.status = response.status;
        throw err;
    }

    return response.json();
}

async function acuityGet(path, params) {
    return acuityRequest('GET', path, { params });
}

async function acuityPost(path, body) {
    return acuityRequest('POST', path, { body });
}

async function acuityPut(path, body) {
    return acuityRequest('PUT', path, { body });
}

module.exports = { acuityGet, acuityPost, acuityPut };
