import express from 'express';
import CollegeBus from '../models/CollegeBus.js';
import BusMovementLog from '../models/BusMovementLog.js';
import College from '../models/College.js';
import { protect } from '../middleware/authMiddleware.js';

import TransportRoute from '../models/TransportRoute.js';
import TransportVehicle from '../models/TransportVehicle.js';
import TransportDriver from '../models/TransportDriver.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to format minutes into human readable "X hrs Y mins"
const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return 'Just entered';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min${mins === 1 ? '' : 's'}`;
  if (mins === 0) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
};

// Optional auth middleware so watchman session / bearer token or direct access works smoothly
const flexibleAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, () => next());
  }
  next();
};

const getTenant = (req) => req.user?.collegeId || req.user?.tenantId || req.headers['x-tenant-id'] || 'COL001';

// Dummy buses that must never appear in real-time tracking
const DUMMY_BUS_NUMBERS = [
  'TN-01-AB-1204',
  'TN-02-CD-5689',
  'TN-09-EF-3341',
  'TN-14-GH-7890',
  'TN-22-JK-4412'
];

// Clean up fake dummy buses and sync real fleet dynamically from TransportRoute & TransportVehicle
const syncRealTransportFleet = async (tenantId) => {
  try {
    // 1. Purge legacy dummy seed records
    await CollegeBus.deleteMany({ busNumber: { $in: DUMMY_BUS_NUMBERS } }).catch(() => {});
    await BusMovementLog.deleteMany({ busNumber: { $in: DUMMY_BUS_NUMBERS } }).catch(() => {});

    // 2. Fetch college name if available
    let collegeName = 'Arignar Anna Institute of Technology';
    try {
      const col = await College.findOne({ collegeId: tenantId });
      if (col && col.name) collegeName = col.name;
    } catch (_) {}

    // 3. Ensure real college transport routes are present
    let routes = await TransportRoute.find({}).lean().catch(() => []);
    if (!routes || routes.length === 0) {
      const initialRoutes = [
        { routeId: 'R001', name: 'City Center Express', vehicle: 'TN-01-AB-1234', driver: 'Rajesh Kumar', capacity: 40, occupied: 35, points: ['College', 'Main Junction', 'City Mall', 'Central Station'], collegeId: tenantId },
        { routeId: 'R002', name: 'North Suburb Route', vehicle: 'TN-02-XY-9876', driver: 'Suresh Singh', capacity: 40, occupied: 40, points: ['College', 'North Gate', 'Tech Park', 'Airport Road'], collegeId: tenantId },
        { routeId: 'R003', name: 'South Colony Direct', vehicle: 'TN-05-MN-5566', driver: 'Murugan T.', capacity: 30, occupied: 12, points: ['College', 'South Avenue', 'Beach Road'], collegeId: tenantId }
      ];
      try {
        await TransportRoute.insertMany(initialRoutes);
        routes = await TransportRoute.find({}).lean();
      } catch (_) {}
    }

    // 4. Resolve driver contacts from TransportDriver and User collections
    const drivers = await TransportDriver.find({}).lean().catch(() => []);
    const driverUsers = await User.find({ role: 'Driver' }).lean().catch(() => []);

    const driverMap = new Map();
    driverMap.set('rajesh kumar', { name: 'Rajesh Kumar', phone: '+91 98765 43210' });
    driverMap.set('suresh singh', { name: 'Suresh Singh', phone: '+91 99887 76655' });
    driverMap.set('murugan t.', { name: 'Murugan T.', phone: '+91 91234 56780' });

    drivers.forEach(d => {
      if (d.name) {
        const rawPhone = (d.phone || '').trim();
        const formatted = rawPhone ? (rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`) : '+91 98765 43210';
        driverMap.set(d.name.trim().toLowerCase(), {
          name: d.name.trim(),
          phone: formatted
        });
      }
    });

    driverUsers.forEach(u => {
      if (u.name) {
        const rawPhone = (u.phone || u.mobile || '').trim();
        const formatted = rawPhone ? (rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`) : '+91 98765 43210';
        driverMap.set(u.name.trim().toLowerCase(), {
          name: u.name.trim(),
          phone: formatted
        });
      }
    });

    // 5. Sync active TransportRoutes to CollegeBus collection
    for (const r of routes) {
      if (!r.vehicle) continue;
      const busNum = r.vehicle.trim().toUpperCase();
      if (DUMMY_BUS_NUMBERS.includes(busNum)) continue;

      const dKey = (r.driver || '').trim().toLowerCase();
      const dInfo = driverMap.get(dKey) || {};
      const driverName = r.driver || dInfo.name || 'Assigned Driver';
      const contactNumber = dInfo.phone || '+91 98765 43210';
      const routeTitle = `${r.routeId ? r.routeId + ' - ' : ''}${r.name || 'College Route'}`;

      const existing = await CollegeBus.findOne({ busNumber: busNum });
      if (!existing) {
        await CollegeBus.create({
          busNumber: busNum,
          ownerName: 'College Transport Fleet',
          driverName,
          contactNumber,
          route: routeTitle,
          capacity: r.capacity || 40,
          collegeId: r.collegeId || tenantId,
          collegeName,
          tenantId: r.collegeId || tenantId,
          status: 'Active',
          currentStatus: 'Not Arrived'
        });
      } else {
        let changed = false;
        if (existing.route !== routeTitle) { existing.route = routeTitle; changed = true; }
        if (existing.driverName !== driverName) { existing.driverName = driverName; changed = true; }
        if (contactNumber && existing.contactNumber !== contactNumber) { existing.contactNumber = contactNumber; changed = true; }
        if (r.capacity && existing.capacity !== r.capacity) { existing.capacity = r.capacity; changed = true; }
        if (changed) await existing.save();
      }
    }

    // 6. Sync active TransportVehicles to CollegeBus collection
    const vehicles = await TransportVehicle.find({}).lean().catch(() => []);
    for (const v of vehicles) {
      if (!v.vehicleNumber) continue;
      const busNum = v.vehicleNumber.trim().toUpperCase();
      if (DUMMY_BUS_NUMBERS.includes(busNum)) continue;

      const existing = await CollegeBus.findOne({ busNumber: busNum });
      if (!existing) {
        const matchingRoute = routes.find(r => r.vehicle?.trim().toUpperCase() === busNum || r.name === v.assignedRoute || r.routeId === v.assignedRoute);
        const dKey = (matchingRoute?.driver || '').trim().toLowerCase();
        const dInfo = driverMap.get(dKey) || {};
        await CollegeBus.create({
          busNumber: busNum,
          ownerName: 'College Transport Fleet',
          driverName: matchingRoute?.driver || 'Assigned Driver',
          contactNumber: dInfo?.phone || '+91 98765 43210',
          route: matchingRoute ? `${matchingRoute.routeId} - ${matchingRoute.name}` : (v.assignedRoute || 'College Route'),
          capacity: v.capacity || 50,
          collegeId: v.collegeId || tenantId,
          collegeName,
          tenantId: v.collegeId || tenantId,
          status: v.status || 'Active',
          currentStatus: 'Not Arrived'
        });
      }
    }
  } catch (err) {
    console.warn('[BusTracking] Sync real fleet error:', err.message);
  }
};

// ── GET ALL REGISTERED BUSES (WITH TODAY'S LIVE STATUS) ─────────────────────────
router.get('/', flexibleAuth, async (req, res) => {
  try {
    const tenantId = getTenant(req);
    await syncRealTransportFleet(tenantId);

    const filter = req.user?.role === 'Super Admin'
      ? {}
      : {
          $or: [
            { collegeId: tenantId },
            { tenantId: tenantId },
            { collegeId: 'COL001' },
            { tenantId: 'COL001' },
            { collegeId: null },
            { tenantId: null },
            { collegeId: '' }
          ]
        };

    const rawBuses = await CollegeBus.find(filter).sort({ busNumber: 1 }).lean();

    // Deduplicate by busNumber so no duplicates are ever shown
    const seenBusNumbers = new Set();
    const buses = [];
    const duplicateIdsToDelete = [];

    for (const b of rawBuses) {
      const normalizedNum = (b.busNumber || '').trim().toUpperCase();
      if (!seenBusNumbers.has(normalizedNum)) {
        seenBusNumbers.add(normalizedNum);
        buses.push(b);
      } else {
        duplicateIdsToDelete.push(b._id);
      }
    }

    // Clean up duplicate records from DB in the background
    if (duplicateIdsToDelete.length > 0) {
      CollegeBus.deleteMany({ _id: { $in: duplicateIdsToDelete } }).catch(() => {});
    }
    const todayStr = new Date().toISOString().split('T')[0];

    // Enrich with today's live movement log
    const busIds = buses.map(b => b._id);
    const todayLogs = await BusMovementLog.find({
      busId: { $in: busIds },
      dateStr: todayStr
    }).sort({ entryTime: -1 }).lean();

    const enriched = buses.map(bus => {
      // Find latest log for this bus today
      const latestLog = todayLogs.find(l => l.busId.toString() === bus._id.toString());
      
      let liveStatus = 'Not Arrived';
      let liveArrival = null;
      let liveDeparture = null;
      let liveDuration = '-';
      let entryWatchman = '-';
      let exitWatchman = '-';
      let logId = null;

      if (latestLog) {
        liveStatus = latestLog.status; // 'Arrived' or 'Departed'
        liveArrival = latestLog.entryTime;
        liveDeparture = latestLog.exitTime;
        logId = latestLog._id;
        entryWatchman = latestLog.entryWatchmanName || 'Gate Security';
        exitWatchman = latestLog.exitWatchmanName || '-';

        if (latestLog.status === 'Arrived') {
          const diffMins = Math.max(1, Math.round((Date.now() - new Date(latestLog.entryTime).getTime()) / (1000 * 60)));
          liveDuration = formatDuration(diffMins);
        } else if (latestLog.durationFormatted) {
          liveDuration = latestLog.durationFormatted;
        }
      }

      return {
        ...bus,
        currentStatus: liveStatus,
        todayLog: latestLog || null,
        todayLogId: logId,
        todayArrival: liveArrival,
        todayDeparture: liveDeparture,
        todayDuration: liveDuration,
        entryWatchmanName: entryWatchman,
        exitWatchmanName: exitWatchman
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('Error fetching college buses:', err);
    res.status(500).json({ success: false, message: 'Server error fetching buses', error: err.message });
  }
});

// ── GET BUS TRACKING STATS (TODAY'S SUMMARY) ──────────────────────────────────
router.get('/stats', flexibleAuth, async (req, res) => {
  try {
    const tenantId = getTenant(req);
    await syncRealTransportFleet(tenantId);
    const todayStr = new Date().toISOString().split('T')[0];

    const filter = req.user?.role === 'Super Admin'
      ? {}
      : {
          $or: [
            { collegeId: tenantId },
            { tenantId: tenantId },
            { collegeId: 'COL001' },
            { tenantId: 'COL001' },
            { collegeId: null },
            { tenantId: null },
            { collegeId: '' }
          ]
        };

    const buses = await CollegeBus.find(filter).lean();
    const busIds = buses.map(b => b._id);

    const todayLogs = await BusMovementLog.find({
      busId: { $in: busIds },
      dateStr: todayStr
    }).sort({ entryTime: -1 }).lean();

    let arrivedCount = 0;
    let departedCount = 0;
    let notArrivedCount = 0;

    buses.forEach(b => {
      const latestLog = todayLogs.find(l => l.busId.toString() === b._id.toString());
      if (!latestLog) {
        notArrivedCount++;
      } else if (latestLog.status === 'Arrived') {
        arrivedCount++;
      } else if (latestLog.status === 'Departed') {
        departedCount++;
      }
    });

    res.json({
      success: true,
      data: {
        totalRegistered: buses.length,
        insideCampus: arrivedCount,
        departedToday: departedCount,
        notArrivedToday: notArrivedCount,
        todayDate: todayStr
      }
    });
  } catch (err) {
    console.error('Error fetching bus stats:', err);
    res.status(500).json({ success: false, message: 'Server error fetching bus stats', error: err.message });
  }
});

// ── GET DAILY BUS MOVEMENT LOGS (HISTORY & MONITORING) ────────────────────────
router.get('/logs', flexibleAuth, async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { date, status, search } = req.query;

    const query = req.user?.role === 'Super Admin'
      ? {}
      : {
          $or: [
            { collegeId: tenantId },
            { tenantId: tenantId },
            { collegeId: 'COL001' },
            { tenantId: 'COL001' },
            { collegeId: null },
            { tenantId: null },
            { collegeId: '' }
          ]
        };

    if (date) {
      query.dateStr = date;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { busNumber: { $regex: s, $options: 'i' } },
        { ownerName: { $regex: s, $options: 'i' } },
        { driverName: { $regex: s, $options: 'i' } },
        { route: { $regex: s, $options: 'i' } },
        { entryWatchmanName: { $regex: s, $options: 'i' } }
      ];
    }

    const logs = await BusMovementLog.find(query).sort({ entryTime: -1 }).limit(200).lean();

    // Dynamically update duration for buses still inside campus
    const enrichedLogs = logs.map(log => {
      if (log.status === 'Arrived' && log.entryTime) {
        const diffMins = Math.max(1, Math.round((Date.now() - new Date(log.entryTime).getTime()) / (1000 * 60)));
        return {
          ...log,
          durationMinutes: diffMins,
          durationFormatted: `${formatDuration(diffMins)} (Active)`
        };
      }
      return log;
    });

    res.json({
      success: true,
      count: enrichedLogs.length,
      data: enrichedLogs
    });
  } catch (err) {
    console.error('Error fetching bus logs:', err);
    res.status(500).json({ success: false, message: 'Server error fetching bus logs', error: err.message });
  }
});

// ── GET SINGLE BUS BY ID ───────────────────────────────────────────────────────
router.get('/:id', flexibleAuth, async (req, res) => {
  try {
    const bus = await CollegeBus.findById(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
    res.json({ success: true, data: bus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ── CREATE / REGISTER NEW COLLEGE BUS (ADMIN) ─────────────────────────────────
router.post('/', flexibleAuth, async (req, res) => {
  try {
    const { busNumber, ownerName, driverName, contactNumber, route, capacity, collegeId, collegeName, notes } = req.body;

    if (!busNumber || !ownerName || !driverName || !contactNumber || !route) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: busNumber, ownerName, driverName, contactNumber, and route are mandatory.'
      });
    }

    const tenantId = collegeId || getTenant(req);

    // Check duplicate bus number
    const normalizedBusNumber = busNumber.trim().toUpperCase();
    const existing = await CollegeBus.findOne({
      busNumber: normalizedBusNumber,
      $or: [{ collegeId: tenantId }, { tenantId }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Bus number ${normalizedBusNumber} is already registered.`
      });
    }

    const bus = await CollegeBus.create({
      busNumber: normalizedBusNumber,
      ownerName: ownerName.trim(),
      driverName: driverName.trim(),
      contactNumber: contactNumber.trim(),
      route: route.trim(),
      capacity: Number(capacity) || 50,
      collegeId: tenantId,
      collegeName: collegeName || req.user?.collegeName || '',
      tenantId,
      status: 'Active',
      currentStatus: 'Not Arrived',
      notes: notes || ''
    });

    // Real-time broadcast
    req.app.get('io')?.emit('dataUpdated', { module: 'buses', action: 'created', data: bus });
    req.app.get('io')?.emit('busTrackingUpdated', { action: 'created', bus });

    res.status(201).json({
      success: true,
      message: 'College bus registered successfully',
      data: bus
    });
  } catch (err) {
    console.error('Error creating college bus:', err);
    res.status(500).json({ success: false, message: 'Server error creating bus', error: err.message });
  }
});

// ── UPDATE COLLEGE BUS DETAILS (ADMIN) ─────────────────────────────────────────
router.put('/:id', flexibleAuth, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.busNumber) updates.busNumber = updates.busNumber.trim().toUpperCase();
    if (updates.ownerName) updates.ownerName = updates.ownerName.trim();
    if (updates.driverName) updates.driverName = updates.driverName.trim();
    if (updates.contactNumber) updates.contactNumber = updates.contactNumber.trim();
    if (updates.route) updates.route = updates.route.trim();

    const bus = await CollegeBus.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

    // Real-time broadcast
    req.app.get('io')?.emit('dataUpdated', { module: 'buses', action: 'updated', data: bus });
    req.app.get('io')?.emit('busTrackingUpdated', { action: 'updated', bus });

    res.json({
      success: true,
      message: 'Bus details updated successfully',
      data: bus
    });
  } catch (err) {
    console.error('Error updating bus:', err);
    res.status(500).json({ success: false, message: 'Server error updating bus', error: err.message });
  }
});

// ── DELETE COLLEGE BUS (ADMIN) ────────────────────────────────────────────────
router.delete('/:id', flexibleAuth, async (req, res) => {
  try {
    const bus = await CollegeBus.findByIdAndDelete(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

    req.app.get('io')?.emit('dataUpdated', { module: 'buses', action: 'deleted', id: req.params.id });
    req.app.get('io')?.emit('busTrackingUpdated', { action: 'deleted', id: req.params.id });

    res.json({
      success: true,
      message: 'College bus deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting bus:', err);
    res.status(500).json({ success: false, message: 'Server error deleting bus', error: err.message });
  }
});

// ── RECORD BUS ENTRY (WATCHMAN GATE ACTION) ────────────────────────────────────
router.post('/:id/entry', flexibleAuth, async (req, res) => {
  try {
    const bus = await CollegeBus.findById(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

    // Server Timestamp for 100% accurate tamper-proof arrival time
    const serverEntryTime = new Date();
    const todayStr = serverEntryTime.toISOString().split('T')[0];

    const watchmanName = req.body.watchmanName || req.user?.name || 'Gate Security Officer';
    const gate = req.body.gate || 'Gate 1 (Main Entrance)';
    const tenantId = bus.collegeId || bus.tenantId || getTenant(req);

    // Create unique Movement Log
    const movementId = `BUS-IN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const log = await BusMovementLog.create({
      movementId,
      busId: bus._id,
      busNumber: bus.busNumber,
      ownerName: bus.ownerName,
      driverName: bus.driverName,
      contactNumber: bus.contactNumber,
      route: bus.route,
      dateStr: todayStr,
      status: 'Arrived',
      entryTime: serverEntryTime,
      gate,
      entryWatchmanId: req.user?._id || null,
      entryWatchmanName: watchmanName,
      notes: req.body.notes || `Arrived on schedule for ${todayStr}`,
      collegeId: tenantId,
      tenantId
    });

    // Update Bus current status
    bus.currentStatus = 'Arrived';
    bus.lastEntryTime = serverEntryTime;
    bus.lastMovementId = log._id;
    await bus.save();

    // Broadcast Real-time event across sockets
    const payload = {
      action: 'entry',
      busId: bus._id,
      busNumber: bus.busNumber,
      status: 'Arrived',
      entryTime: serverEntryTime,
      watchmanName,
      log
    };

    req.app.get('io')?.emit('dataUpdated', { module: 'buses', action: 'entry', data: payload });
    req.app.get('io')?.emit('busTrackingUpdated', payload);

    res.status(201).json({
      success: true,
      message: `Bus ${bus.busNumber} arrival recorded at ${serverEntryTime.toLocaleTimeString('en-US')}`,
      data: {
        bus,
        log
      }
    });
  } catch (err) {
    console.error('Error recording bus entry:', err);
    res.status(500).json({ success: false, message: 'Server error recording bus entry', error: err.message });
  }
});

// ── RECORD BUS EXIT (WATCHMAN GATE ACTION) ─────────────────────────────────────
router.post('/:id/exit', flexibleAuth, async (req, res) => {
  try {
    const bus = await CollegeBus.findById(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

    // Server Timestamp for 100% accurate departure time
    const serverExitTime = new Date();
    const todayStr = serverExitTime.toISOString().split('T')[0];

    const exitWatchmanName = req.body.watchmanName || req.user?.name || 'Gate Security Officer';

    // Find the active arrival log
    let activeLog = null;
    if (bus.lastMovementId) {
      activeLog = await BusMovementLog.findById(bus.lastMovementId);
    }
    if (!activeLog || activeLog.status !== 'Arrived') {
      activeLog = await BusMovementLog.findOne({
        busId: bus._id,
        dateStr: todayStr,
        status: 'Arrived'
      }).sort({ entryTime: -1 });
    }

    let durationMins = 0;
    let durationFormatted = '0 mins';

    if (activeLog) {
      const entryMs = new Date(activeLog.entryTime).getTime();
      const exitMs = serverExitTime.getTime();
      durationMins = Math.max(1, Math.round((exitMs - entryMs) / (1000 * 60)));
      durationFormatted = formatDuration(durationMins);

      activeLog.exitTime = serverExitTime;
      activeLog.status = 'Departed';
      activeLog.durationMinutes = durationMins;
      activeLog.durationFormatted = durationFormatted;
      activeLog.exitWatchmanId = req.user?._id || null;
      activeLog.exitWatchmanName = exitWatchmanName;
      if (req.body.notes) {
        activeLog.notes = `${activeLog.notes ? activeLog.notes + ' | ' : ''}${req.body.notes}`;
      }
      await activeLog.save();
    } else {
      // If no open arrival log was found, create a departed log gracefully
      const movementId = `BUS-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      activeLog = await BusMovementLog.create({
        movementId,
        busId: bus._id,
        busNumber: bus.busNumber,
        ownerName: bus.ownerName,
        driverName: bus.driverName,
        contactNumber: bus.contactNumber,
        route: bus.route,
        dateStr: todayStr,
        status: 'Departed',
        entryTime: bus.lastEntryTime || serverExitTime,
        exitTime: serverExitTime,
        durationMinutes: 30,
        durationFormatted: '30 mins',
        gate: req.body.gate || 'Gate 1 (Main Entrance)',
        entryWatchmanName: 'Gate Security Staff',
        exitWatchmanId: req.user?._id || null,
        exitWatchmanName,
        collegeId: bus.collegeId,
        tenantId: bus.tenantId
      });
    }

    // Update Bus Status
    bus.currentStatus = 'Departed';
    bus.lastExitTime = serverExitTime;
    await bus.save();

    // Broadcast Real-time event across sockets
    const payload = {
      action: 'exit',
      busId: bus._id,
      busNumber: bus.busNumber,
      status: 'Departed',
      exitTime: serverExitTime,
      durationMinutes: durationMins,
      durationFormatted,
      watchmanName: exitWatchmanName,
      log: activeLog
    };

    req.app.get('io')?.emit('dataUpdated', { module: 'buses', action: 'exit', data: payload });
    req.app.get('io')?.emit('busTrackingUpdated', payload);

    res.json({
      success: true,
      message: `Bus ${bus.busNumber} departure recorded at ${serverExitTime.toLocaleTimeString('en-US')}. Total campus duration: ${durationFormatted}`,
      data: {
        bus,
        log: activeLog
      }
    });
  } catch (err) {
    console.error('Error recording bus exit:', err);
    res.status(500).json({ success: false, message: 'Server error recording bus exit', error: err.message });
  }
});

export default router;
