const { format, subDays, parseISO } = require('date-fns');

/**
 * Group receipts by day for dashboard charts
 */
function groupReceiptsByDay(receipts, days, locale, dateMode = 'transaction') {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate date keys for the last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = format(date, 'yyyy-MM-dd');

    result.push({
      dateKey,
      date,
      count: 0,
      totalSpent: 0,
      receipts: [],
      isToday: dateKey === format(today, 'yyyy-MM-dd')
    });
  }

  // Group receipts by date
  receipts.forEach((receipt) => {
    let receiptDate;
    if (dateMode === 'transaction' && receipt.transaction_date) {
      receiptDate = parseISO(receipt.transaction_date);
    } else if (receipt.created_at) {
      receiptDate = parseISO(receipt.created_at);
    } else {
      return; // Skip receipts without valid date
    }

    // Check if receipt falls within our date range
    const oldestDate = new Date(today);
    oldestDate.setDate(today.getDate() - (days - 1));
    oldestDate.setHours(0, 0, 0, 0);

    if (receiptDate < oldestDate) {
      return; // Skip old receipts
    }

    const dateKey = format(receiptDate, 'yyyy-MM-dd');
    const dayData = result.find((d) => d.dateKey === dateKey);

    if (dayData) {
      dayData.count += 1;
      dayData.totalSpent += receipt.total_amount || 0;
      dayData.receipts.push(receipt);
    }
  });

  return result;
}

module.exports = {
  groupReceiptsByDay
};
