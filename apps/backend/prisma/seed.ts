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
  console.log(`• Daily Meals Generated:  ${report.counts.meals} (${report.counts.mealConfirmations} Confirmations)`);
  console.log(`• Gate Pass Visitors:     ${report.counts.visitors}`);
  console.log(`• Inventory Assets:       ${report.counts.inventoryItems} (${report.counts.inventoryUsages} usages, ${report.counts.inventoryPurchases} purchases)`);
  console.log(`• Activity Logs:          ${report.counts.activityLogs}`);
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
