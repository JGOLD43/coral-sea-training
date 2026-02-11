/**
 * Coral Sea Training - Firebase Cloud Functions
 * Acuity Scheduling API proxy + partner booking sync + webhooks
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const { acuityGet, acuityPost, acuityPut } = require('./acuityClient');

admin.initializeApp();

// CORS — restrict to admin panel origins
const corsHandler = cors({
    origin: [
        'https://jgold43.github.io',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
        'http://127.0.0.1:8080'
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

    if (uidList.length > 0 && !uidList.includes(decoded.uid)) {
        const err = new Error('Forbidden — not an admin user');
        err.status = 403;
        throw err;
    }

    return decoded;
}

// Helper to handle errors consistently
function handleError(res, err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    functions.logger.error('API Error:', { status, message });
    res.status(status).json({ error: message });
}

// =====================================================
// Proxy Endpoints
// =====================================================

// GET /api/appointments — List appointments with filters
exports.getAppointments = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const data = await acuityGet('/appointments', req.query);
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
            const id = req.query.id;
            if (!id) {
                res.status(400).json({ error: 'Missing appointment id' });
                return;
            }
            const data = await acuityGet('/appointments/' + id);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// POST /api/appointments — Create appointment
exports.createAppointment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const data = await acuityPost('/appointments', req.body);
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// PUT /api/appointments/:id/cancel — Cancel appointment
exports.cancelAppointment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const id = req.query.id || (req.body && req.body.id);
            if (!id) {
                res.status(400).json({ error: 'Missing appointment id' });
                return;
            }
            const data = await acuityPut('/appointments/' + id + '/cancel');
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });
});

// PUT /api/appointments/:id/reschedule — Reschedule appointment
exports.rescheduleAppointment = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            await verifyAdmin(req);
            const id = req.query.id || (req.body && req.body.id);
            const datetime = req.body && req.body.datetime;
            if (!id || !datetime) {
                res.status(400).json({ error: 'Missing appointment id or datetime' });
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
            const data = await acuityGet('/availability/dates', req.query);
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
            const data = await acuityGet('/availability/times', req.query);
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
            const data = await acuityGet('/clients', req.query);
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

    const { action, id } = req.body;
    if (!action || !id) {
        res.status(400).send('Missing action or id');
        return;
    }

    try {
        // Fetch full appointment from Acuity to confirm authenticity
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

            // Create Acuity appointment for each employee
            const appointmentIds = [];
            const employees = booking.employees || [];

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
