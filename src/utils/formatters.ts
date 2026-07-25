export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};

export function formatDate(value?: string | number | Date | null): string {
  if (value === undefined || value === null) return "N/A";

  // Treat empty string as missing.
  if (typeof value === "string" && value.trim() === "") return "N/A";

  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();

  if (Number.isNaN(time)) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(date);
}


export const formatDateFull = (date: Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const convertToWords = (num: number): string => {
  if (num === 0) return "Zero Rupees Only";

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertBelow1000(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return (
      ones[Math.floor(n / 100)] +
      ' Hundred' +
      (n % 100 !== 0 ? ' and ' + convertBelow1000(n % 100) : '')
    );
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  let result = '';

  if (crore > 0) result += convertBelow1000(crore) + ' Crore ';
  if (lakh > 0) result += convertBelow1000(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelow1000(thousand) + ' Thousand ';
  if (remainder > 0) result += convertBelow1000(remainder);

  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
};

export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const numInt = Math.floor(num);
  const decimal = Math.round((num - numInt) * 100);

  let result = '';

  if (numInt >= 10000000) {
    result += convertLessThanThousand(Math.floor(numInt / 10000000)) + ' Crore ';
    num = numInt % 10000000;
  }
  if (numInt >= 100000) {
    result += convertLessThanThousand(Math.floor((numInt % 10000000) / 100000)) + ' Lakh ';
  }
  if (numInt >= 1000) {
    result += convertLessThanThousand(Math.floor((numInt % 100000) / 1000)) + ' Thousand ';
  }
  result += convertLessThanThousand(numInt % 1000);

  result = result.trim() + ' Rupees';

  if (decimal > 0) {
    result += ' and ' + convertLessThanThousand(decimal) + ' Paise';
  }

  return result + ' Only';
};
