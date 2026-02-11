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

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`Acuity API error ${response.status}: ${errorBody}`);
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
