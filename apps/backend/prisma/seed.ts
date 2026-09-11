import { seedDatabase } from '../src/core/seed.service';

async function main() {
  const args = process.argv.slice(2);
  let size: 'small' | 'medium' | 'large' = 'medium';
  let clearExisting = true;

  for (const arg of args) {
    if (arg.startsWith('--size=')) {
      const val = arg.split('=')[1].toLowerCase();
      if (val === 'small' || val === 'medium' || val === 'large') {
        size = val;
      }
    }
    if (arg.startsWith('--clear=')) {
      clearExisting = arg.split('=')[1].toLowerCase() !== 'false';
    }
  }

  const report = await seedDatabase({ size, clearExisting });
  console.log("\n=======================================================");
  console.log("📊 SEEDING SUMMARY REPORT");
  console.log("=======================================================");
  console.log(`• Dataset Size:           ${report.size.toUpperCase()}`);
  console.log(`• Duration:               ${report.durationMs} ms`);
  console.log(`• Hostels Populated:      ${report.counts.hostels}`);
  console.log(`• Blocks Populated:       ${report.counts.blocks}`);
  console.log(`• Total Rooms:            ${report.counts.rooms} (${report.counts.maintenanceRooms} in maintenance)`);
  console.log(`• Total Beds:             ${report.counts.beds}`);
  console.log(`• Occupied Beds:          ${report.counts.occupiedBeds} (${report.counts.occupancyPercentage}% Occupancy)`);
  console.log(`• Vacant Beds:            ${report.counts.vacantBeds}`);
  console.log(`• Total Users:            ${report.counts.users} (${report.counts.students} Students, ${report.counts.testAccounts} Test Role Accounts)`);
  console.log(`• 30-Day Attendance Logs: ${report.counts.attendanceRecords}`);
  console.log(`• Leave Records:          ${report.counts.leaveRecords}`);
  console.log(`• Maintenance Tickets:    ${report.counts.complaints}`);
  console.log(`• Fee Statements:         ${report.counts.feeRecords} (Rs. ${report.counts.totalFeeAmount.toLocaleString()})`);
  console.log(`• Collections Recorded:   ${report.counts.paymentRecords} (Rs. ${report.counts.totalPaidAmount.toLocaleString()})`);
  console.log(`• Outstanding Dues:       Rs. ${report.counts.totalPendingAmount.toLocaleString()}`);
  console.log(`• Daily Meals Generated:  ${report.counts.meals} (${report.counts.mealConfirmations} Confirmations, ${report.counts.messWasteLogs} Waste Logs)`);
  console.log(`• Laundry Operations:     ${report.counts.laundrySlots} slots (${report.counts.laundryWaitlists} waitlists)`);
  console.log(`• Gate Passes & Outpasses:${report.counts.gatePasses}`);
  console.log(`• Gate Pass Visitors:     ${report.counts.visitors}`);
  console.log(`• Notices & Announcements:${report.counts.notices}`);
  console.log(`• Emergency Alerts:       ${report.counts.emergencies}`);
  console.log(`• Inventory & Ledgers:    ${report.counts.inventoryItems} items (${report.counts.inventoryUsages} usages, ${report.counts.inventoryPurchases} purchases, ${report.counts.inventoryLedgers} ledger txns)`);
  console.log(`• Financial Operations:   ${report.counts.expenses} expenses, ${report.counts.payrolls} payroll slips`);
  console.log(`• Assets & Assignments:   ${report.counts.assets} assets (${report.counts.assetAssignments} assignments)`);
  console.log(`• Room Inspections:       ${report.counts.roomInspections}`);
  console.log(`• Preventive Maint.:      ${report.counts.preventiveMaintenances} equipment`);
  console.log(`• Incident Reports:       ${report.counts.incidentReports} records`);
  console.log(`• Student Documents:      ${report.counts.documents} files`);
  console.log(`• Activity Logs & Notifs: ${report.counts.activityLogs} logs, ${report.counts.notifications} notifications`);
  console.log("=======================================================");
  console.log("Validation Result: " + (report.validationPassed ? "✅ PASSED" : "❌ FAILED"));
  for (const detail of report.validationDetails) {
    console.log("  " + detail);
  }
  console.log("=======================================================\n");
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
