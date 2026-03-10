(function() {
    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    var runtimeConfig = window.CST_RUNTIME_CONFIG || {};
    var metaApiBase = '';
    var metaMetrics = '';
    var apiMeta = document.querySelector('meta[name="cst-public-api-base"]');
    var metricsMeta = document.querySelector('meta[name="cst-metrics-endpoint"]');

    if (apiMeta && apiMeta.content) metaApiBase = apiMeta.content.trim();
    if (metricsMeta && metricsMeta.content) metaMetrics = metricsMeta.content.trim();

    window.CST_PUBLIC_CONFIG = Object.assign(
        {
            analytics: {
                measurementId: '',
                posthogKey: '',
                posthogHost: ''
            },
            forms: {
                contact: '',
                booking: '',
                business: '',
                corporate: '',
                lead: '',
                kits: ''
            },
            checkoutEndpoint: isLocal ? 'http://localhost:3001/api/public-bookings/createCheckoutSession' : '',
            metricsEndpoint: metaMetrics || (isLocal ? 'http://localhost:3001/api/metrics/ingest' : ''),
            publicApiBaseUrl: metaApiBase || (isLocal ? 'http://localhost:3001/api/public-bookings' : ''),
            adminFunctionsBaseUrl: '',
            fallbackContact: {
                email: 'admin@coralseatraining.com.au',
                phone: '0419675022',
                phoneDisplay: '0419 675 022'
            }
        },
        runtimeConfig,
        window.CST_PUBLIC_CONFIG || {}
    );
})();
