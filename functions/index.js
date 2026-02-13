/**
 * Coral Sea Training - Firebase Cloud Functions
 * Acuity Scheduling API proxy + partner booking sync + webhooks
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const { acuityGet, acuityPost, acuityPut } = require('./acuityClient');

admin.initializeApp();

// CORS — restrict to production origins only
// For local development, use Firebase emulator or add localhost origins temporarily
const corsHandler = cors({
    origin: [
        'https://jgold43.github.io',
        'http://localhost:5000'
    ],
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

// =====================================================
// Auth Middleware — verify Firebase ID token + admin UID
// =====================================================

async function verifyAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const err = new Error('Missing or invalid Authorization header');
        err.status = 401;
        throw err;
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);

    const adminUids = (functions.config().admin && functions.config().admin.uids) || '';
    const uidList = adminUids.split(',').map(u => u.trim()).filter(Boolean);

    // Default-deny: if no admin UIDs configured, reject all requests
    if (uidList.length === 0) {
        const err = new Error('Forbidden — admin UIDs not configured');
        err.status = 403;
        throw err;
    }

    if (!uidList.includes(decoded.uid)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }

    return decoded;
}

// Validate that an ID is a safe numeric string (prevents path traversal)
function validateId(id) {
    if (!id || !/^\d+$/.test(String(id))) {
        const err = new Error('Invalid ID');
        err.status = 400;
        throw err;
    }
    return String(id);
}

// Whitelist allowed query params for Acuity proxy endpoints
function filterParams(query, allowed) {
    const filtered = {};
    for (const key of allowed) {
        if (query[key] !== undefined && query[key] !== '') {
            filtered[key] = String(query[key]);
        }
    }
    return filtered;
}

// Helper to handle errors consistently — sanitize messages to prevent info leakage
function handleError(res, err) {
    const status = err.status || 500;
    functions.logger.error('API Error:', { status, message: err.message });

    // Only return our own error messages, never raw Acuity/internal errors
    const safeMessages = {
        400: 'Bad request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not found',
        405: 'Method not allowed'
    };
    const message = safeMessages[status] || err.message || 'Internal server error';
    // Strip any Acuity API details from error messages
    const sanitized = message.startsWith('Acuity API error') ? 'Scheduling service error' : message;
    res.status(status).json({ error: sanitized });
}

// =====================================================
// Proxy Endpoints
// =====================================================

// GET /api/appointments — List appointments with filters
exports.getAppointments = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const params = filterParams(req.query, [
                'minDate', 'maxDate', 'appointmentTypeID', 'calendarID',
                'canceled', 'max', 'direction'
            ]);
            const data = await acuityGet('/appointments', params);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// GET /api/appointments/:id — Single appointment detail
exports.getAppointment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const id = validateId(req.query.id);
            const data = await acuityGet('/appointments/' + id);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// POST /api/appointments — Create appointment (whitelist allowed fields)
exports.createAppointment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
        try {
            await verifyAdmin(req);
            const body = req.body || {};
            const safeBody = {};
            const allowed = ['appointmentTypeID', 'datetime', 'firstName', 'lastName',
                'email', 'phone', 'calendarID', 'notes', 'fields'];
            for (const key of allowed) {
                if (body[key] !== undefined) safeBody[key] = body[key];
            }
            const data = await acuityPost('/appointments', safeBody);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// PUT /api/appointments/:id/cancel — Cancel appointment (PUT only)
exports.cancelAppointment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'PUT' && req.method !== 'OPTIONS') { res.status(405).json({ error: 'Method not allowed' }); return; }
        try {
            await verifyAdmin(req);
            const id = validateId(req.query.id || (req.body && req.body.id));
            const data = await acuityPut('/appointments/' + id + '/cancel');
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// PUT /api/appointments/:id/reschedule — Reschedule appointment (PUT only)
exports.rescheduleAppointment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'PUT' && req.method !== 'OPTIONS') { res.status(405).json({ error: 'Method not allowed' }); return; }
        try {
            await verifyAdmin(req);
            const id = validateId(req.query.id || (req.body && req.body.id));
            const datetime = req.body && req.body.datetime;
            if (!datetime || typeof datetime !== 'string') {
                res.status(400).json({ error: 'Missing or invalid datetime' });
                return;
            }
            const data = await acuityPut('/appointments/' + id + '/reschedule', {
                datetime: datetime
            });
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// GET /api/appointment-types — List appointment types
exports.getAppointmentTypes = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const data = await acuityGet('/appointment-types');
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// GET /api/availability/dates — Available dates for an appointment type
exports.getAvailableDates = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const params = filterParams(req.query, ['appointmentTypeID', 'month', 'calendarID']);
            const data = await acuityGet('/availability/dates', params);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// GET /api/availability/times — Available times for a specific date
exports.getAvailableTimes = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const params = filterParams(req.query, ['appointmentTypeID', 'date', 'calendarID']);
            const data = await acuityGet('/availability/times', params);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// GET /api/clients — List clients
exports.getClients = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const params = filterParams(req.query, ['search', 'max', 'direction']);
            const data = await acuityGet('/clients', params);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// GET /api/calendars — List calendars
exports.getCalendars = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const data = await acuityGet('/calendars');
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// =====================================================
// Webhook — Acuity sends appointment events here
// =====================================================

exports.acuityWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    // Verify webhook secret — fail-closed: reject if secret not configured
    // Set via: firebase functions:config:set acuity.webhook_secret="YOUR_SECRET"
    const webhookSecret = (functions.config().acuity && functions.config().acuity.webhook_secret) || '';
    if (!webhookSecret) {
        functions.logger.error('Webhook secret not configured — rejecting request');
        res.status(403).send('Forbidden');
        return;
    }
    const providedSecret = req.headers['x-acuity-secret'] || req.query.secret || '';
    if (providedSecret !== webhookSecret) {
        res.status(403).send('Forbidden');
        return;
    }

    const { action, id } = req.body;
    if (!action || !id) {
        res.status(400).send('Missing action or id');
        return;
    }

    // Validate action is a known Acuity event
    const validActions = [
        'appointment.scheduled', 'appointment.rescheduled',
        'appointment.canceled', 'appointment.changed'
    ];
    if (!validActions.includes(action)) {
        res.status(400).send('Unknown action');
        return;
    }

    // Validate appointment ID is numeric (prevents path traversal)
    if (!/^\d+$/.test(String(id))) {
        res.status(400).send('Invalid id');
        return;
    }

    try {
        // Fetch full appointment from Acuity to confirm it exists
        const appointment = await acuityGet('/appointments/' + id);

        const statusMap = {
            'appointment.scheduled': 'confirmed',
            'appointment.rescheduled': 'rescheduled',
            'appointment.canceled': 'cancelled',
            'appointment.changed': 'confirmed'
        };

        const newStatus = statusMap[action] || 'confirmed';
        const db = admin.firestore();

        // Find matching Firestore booking by acuityAppointmentId
        const bookingsQuery = await db.collectionGroup('bookings')
            .where('acuityAppointmentIds', 'array-contains', appointment.id)
            .get();

        const batch = db.batch();
        bookingsQuery.forEach(doc => {
            batch.update(doc.ref, {
                status: newStatus,
                acuityLastSync: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        // Mirror to top-level collection for admin reference
        const aptRef = db.collection('acuityAppointments').doc(String(appointment.id));
        batch.set(aptRef, {
            acuityId: appointment.id,
            type: appointment.type || '',
            firstName: appointment.firstName || '',
            lastName: appointment.lastName || '',
            email: appointment.email || '',
            phone: appointment.phone || '',
            datetime: appointment.datetime || '',
            duration: appointment.duration || 0,
            calendar: appointment.calendar || '',
            canceled: appointment.canceled || false,
            lastWebhookAction: action,
            lastWebhookAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await batch.commit();

        res.status(200).send('OK');
    } catch (err) {
        functions.logger.error('Webhook processing error:', err);
        // Return 200 to prevent Acuity from retrying on our processing errors
        res.status(200).send('OK');
    }
});

// =====================================================
// Firestore Trigger — Auto-sync partner bookings to Acuity
// =====================================================

exports.onBookingCreated = functions.firestore
    .document('partners/{partnerId}/bookings/{bookingId}')
    .onCreate(async (snap, context) => {
        const booking = snap.data();
        const { partnerId, bookingId } = context.params;

        // Skip if already synced or sync disabled
        if (booking.acuitySyncStatus === 'synced' || booking.skipAcuitySync) {
            return null;
        }

        try {
            // Load partner details
            const partnerDoc = await admin.firestore()
                .collection('partners').doc(partnerId).get();

            if (!partnerDoc.exists) {
                functions.logger.warn('Partner not found:', partnerId);
                return null;
            }

            const partner = partnerDoc.data();

            // Get Acuity appointment types to find a match
            const acuityTypes = await acuityGet('/appointment-types');
            const matchingType = acuityTypes.find(t =>
                t.name.toLowerCase().includes((booking.courseCode || '').toLowerCase()) ||
                t.name.toLowerCase().includes((booking.courseName || '').toLowerCase())
            );

            if (!matchingType) {
                functions.logger.warn('No matching Acuity type for:', booking.courseName);
                await snap.ref.update({
                    acuitySyncStatus: 'no_match',
                    acuitySyncError: 'No matching Acuity appointment type found'
                });
                return null;
            }

            // Create Acuity appointment for each employee (limit to prevent abuse)
            const MAX_EMPLOYEES_PER_BOOKING = 100;
            const appointmentIds = [];
            const employees = (booking.employees || []).slice(0, MAX_EMPLOYEES_PER_BOOKING);

            if (booking.employees && booking.employees.length > MAX_EMPLOYEES_PER_BOOKING) {
                functions.logger.warn('Booking exceeds employee limit:', {
                    bookingId, partnerId, count: booking.employees.length
                });
            }

            // Validate courseDate format before using in API calls
            if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.courseDate || '')) {
                await snap.ref.update({
                    acuitySyncStatus: 'failed',
                    acuitySyncError: 'Invalid courseDate format'
                });
                return null;
            }

            for (const emp of employees) {
                const nameParts = (emp.name || '').split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                const appointment = await acuityPost('/appointments', {
                    appointmentTypeID: matchingType.id,
                    datetime: booking.courseDate + 'T09:00:00',
                    firstName: firstName,
                    lastName: lastName,
                    email: emp.email || partner.email,
                    phone: partner.phone || '',
                    notes: 'Partner booking: ' + (partner.businessName || '') +
                           '\nBooking ID: ' + bookingId +
                           '\nPartner ID: ' + partnerId
                });

                appointmentIds.push(appointment.id);
            }

            await snap.ref.update({
                acuityAppointmentIds: appointmentIds,
                acuitySyncStatus: 'synced',
                acuitySyncedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            functions.logger.info('Synced booking to Acuity:', {
                bookingId,
                partnerId,
                appointmentIds
            });

        } catch (err) {
            functions.logger.error('Acuity sync failed:', {
                bookingId,
                partnerId,
                error: err.message
            });
            await snap.ref.update({
                acuitySyncStatus: 'failed',
                acuitySyncError: err.message
            });
        }

        return null;
    });

// =====================================================
// Stripe Checkout — Public endpoint (no auth required)
// =====================================================

exports.createCheckoutSession = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        try {
            const body = req.body || {};
            const {
                courseName,
                courseCode,
                pricePerPerson,
                partySize,
                addOns,
                customerEmail,
                customerName,
                customerPhone,
                sessionId,
                sessionLabel,
                location,
                employer
            } = body;

            // Validate required fields
            if (!courseName || typeof courseName !== 'string') {
                res.status(400).json({ error: 'Missing or invalid courseName' });
                return;
            }
            if (pricePerPerson === undefined || typeof pricePerPerson !== 'number' || pricePerPerson <= 0) {
                res.status(400).json({ error: 'Missing or invalid pricePerPerson' });
                return;
            }
            if (!partySize || typeof partySize !== 'number' || partySize < 1 || !Number.isInteger(partySize)) {
                res.status(400).json({ error: 'Missing or invalid partySize' });
                return;
            }
            if (!customerEmail || typeof customerEmail !== 'string') {
                res.status(400).json({ error: 'Missing or invalid customerEmail' });
                return;
            }

            // Initialise Stripe with secret key from Firebase config
            const stripe = require('stripe')(functions.config().stripe.secret_key);

            // Build line items — main course item
            const lineItems = [
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: courseName,
                            description: [
                                courseCode || '',
                                sessionLabel || '',
                                location || ''
                            ].filter(Boolean).join(' — ')
                        },
                        unit_amount: Math.round(pricePerPerson * 100) // dollars to cents
                    },
                    quantity: partySize
                }
            ];

            // Add each add-on as a separate line item
            if (Array.isArray(addOns)) {
                for (const addOn of addOns) {
                    if (addOn && addOn.label && typeof addOn.price === 'number') {
                        lineItems.push({
                            price_data: {
                                currency: 'aud',
                                product_data: {
                                    name: addOn.label
                                },
                                unit_amount: Math.round(addOn.price * 100)
                            },
                            quantity: 1
                        });
                    }
                }
            }

            // Build metadata with all booking details
            const metadata = {
                customerName: customerName || '',
                customerPhone: customerPhone || '',
                customerEmail: customerEmail || '',
                sessionId: sessionId || '',
                location: location || '',
                courseCode: courseCode || '',
                partySize: String(partySize),
                employer: employer || ''
            };

            // Include add-on IDs in metadata
            if (Array.isArray(addOns) && addOns.length > 0) {
                metadata.addOnIds = addOns
                    .filter(a => a && a.id)
                    .map(a => a.id)
                    .join(',');
            }

            // Create Stripe Checkout Session
            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                customer_email: customerEmail,
                line_items: lineItems,
                metadata: metadata,
                success_url: 'https://jgold43.github.io/coral-sea-training/thanks.html?type=booking&stripe_session={CHECKOUT_SESSION_ID}',
                cancel_url: 'https://jgold43.github.io/coral-sea-training/courses.html'
            });

            res.status(200).json({ url: session.url });

        } catch (err) {
            functions.logger.error('Stripe Checkout error:', { message: err.message });
            // Sanitize — never leak Stripe internals
            res.status(500).json({ error: 'Payment session could not be created' });
        }
    });
});
