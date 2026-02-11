/**
 * Coral Sea Training — Centralized Course Data
 * Single source of truth for courses, prices, and dates.
 * Update dates here when new courses are scheduled.
 */

var COURSE_DATA = [
    {
        id: 'cpr',
        code: 'HLTAID009',
        title: 'CPR Course',
        funnelName: 'The 2-Hour Lifesaver',
        price: 99,
        priceLabel: '$99',
        duration: 'Approx. 3 hours',
        validity: '12 months',
        locations: {
            townsville: ['2026-02-22', '2026-03-08', '2026-03-22', '2026-04-05', '2026-04-19'],
            widebay: ['2026-03-01', '2026-03-15', '2026-04-12', '2026-04-26']
        }
    },
    {
        id: 'firstaid',
        code: 'HLTAID011',
        title: 'Provide First Aid',
        funnelName: 'The Complete First Aider',
        price: 159,
        priceLabel: '$159',
        duration: 'Approx. 7 hours (1 day)',
        validity: '3 years (CPR renewed annually)',
        locations: {
            townsville: ['2026-02-22', '2026-03-08', '2026-03-22', '2026-04-05', '2026-04-19'],
            widebay: ['2026-03-01', '2026-03-15', '2026-04-12', '2026-04-26']
        }
    },
    {
        id: 'childcare',
        code: 'HLTAID012',
        title: 'Childcare First Aid',
        funnelName: 'The Educator Shield',
        price: 199,
        priceLabel: '$199',
        duration: 'Approx. 8 hours (1 day)',
        validity: '3 years (CPR renewed annually)',
        locations: {
            townsville: ['2026-02-22', '2026-03-08', '2026-03-22', '2026-04-05'],
            widebay: ['2026-03-01', '2026-03-15', '2026-04-12']
        }
    },
    {
        id: 'advanced',
        code: 'HLTAID015',
        title: 'Advanced Resuscitation',
        funnelName: 'Advanced Resuscitation',
        price: 199,
        priceLabel: '$199',
        duration: 'Approx. 6 hours (1 day)',
        validity: '12 months',
        locations: {
            townsville: ['2026-03-08', '2026-04-05'],
            widebay: ['2026-03-15', '2026-04-12']
        }
    }
];

/**
 * Get a course by ID or unit code
 */
function getCourse(idOrCode) {
    if (!idOrCode) return null;
    var search = idOrCode.toLowerCase();
    for (var i = 0; i < COURSE_DATA.length; i++) {
        if (COURSE_DATA[i].id === search || COURSE_DATA[i].code.toLowerCase() === search) {
            return COURSE_DATA[i];
        }
    }
    return null;
}

/**
 * Format a date string (YYYY-MM-DD) for display
 * Returns e.g. "Sat 22 Feb" or "Saturday 22 February 2026" if long=true
 */
function formatDate(dateStr, long) {
    var parts = dateStr.split('-');
    var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var daysLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (long) {
        return daysLong[d.getDay()] + ' ' + d.getDate() + ' ' + monthsLong[d.getMonth()] + ' ' + d.getFullYear();
    }
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
}

/**
 * Get the next upcoming date for a location (or any location if none specified).
 * Returns { dateStr: 'YYYY-MM-DD', formatted: 'Sat 22 Feb', location: 'townsville' } or null
 */
function getNextDate(locationId, courseId) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

    var best = null;
    var courses = courseId ? [getCourse(courseId)] : COURSE_DATA;

    for (var c = 0; c < courses.length; c++) {
        if (!courses[c]) continue;
        var locs = locationId ? [locationId] : Object.keys(courses[c].locations);
        for (var l = 0; l < locs.length; l++) {
            var dates = courses[c].locations[locs[l]];
            if (!dates) continue;
            for (var d = 0; d < dates.length; d++) {
                if (dates[d] >= todayStr) {
                    if (!best || dates[d] < best.dateStr) {
                        best = {
                            dateStr: dates[d],
                            formatted: formatDate(dates[d]),
                            formattedLong: formatDate(dates[d], true),
                            location: locs[l],
                            courseId: courses[c].id
                        };
                    }
                }
            }
        }
    }
    return best;
}

/**
 * Get all upcoming dates for a course at a location
 * Returns array of { dateStr, formatted, formattedLong }
 */
function getUpcomingDates(courseId, locationId) {
    var course = getCourse(courseId);
    if (!course || !course.locations[locationId]) return [];

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

    var dates = course.locations[locationId];
    var result = [];
    for (var i = 0; i < dates.length; i++) {
        if (dates[i] >= todayStr) {
            result.push({
                dateStr: dates[i],
                formatted: formatDate(dates[i]),
                formattedLong: formatDate(dates[i], true)
            });
        }
    }
    return result;
}
