/** Company-specific pay data (India, 2025-26). Each entry stores a typical
 *  MID-LEVEL software-engineer total CTC (₹, incl. base+bonus+ESOP). The role
 *  estimator turns this into a factor = midSWE / ₹18L baseline, so a recognised
 *  employer replaces the coarse tier multiplier with real, company-level data.
 *
 *  Sources: Levels.fyi, AmbitionBox, Glassdoor, Blind + salary reports (2025).
 *  These are rough public averages, not offers — always verify. Order matters:
 *  more specific / compound names first so "SAP Labs" wins before "SAP", etc. */

export interface CompanyRow {
  name: string;
  re: RegExp;
  midL: number; // mid-level SWE CTC in ₹ lakhs
}

const BASELINE_L = 18; // ₹18L mid SWE = factor 1.0

export const COMPANIES: CompanyRow[] = [
  // ── Global product / FAANG+ ──
  { name: 'Google', midL: 60, re: /\bgoogle\b/i },
  { name: 'Meta', midL: 65, re: /\b(meta|facebook)\b/i },
  { name: 'Netflix', midL: 80, re: /\bnetflix\b/i },
  { name: 'Apple', midL: 50, re: /\bapple\b/i },
  { name: 'Amazon', midL: 50, re: /\b(amazon|aws|a9)\b/i },
  { name: 'Microsoft', midL: 45, re: /\bmicrosoft\b/i },
  { name: 'Nvidia', midL: 42, re: /\bnvidia\b/i },
  { name: 'Adobe', midL: 38, re: /\badobe\b/i },
  { name: 'Salesforce', midL: 38, re: /\bsalesforce\b/i },
  { name: 'Atlassian', midL: 55, re: /\batlassian\b/i },
  { name: 'Uber', midL: 55, re: /\buber\b/i },
  { name: 'LinkedIn', midL: 55, re: /\blinkedin\b/i },
  { name: 'Airbnb', midL: 55, re: /\bairbnb\b/i },
  { name: 'Databricks', midL: 60, re: /\bdatabricks\b/i },
  { name: 'Stripe', midL: 55, re: /\bstripe\b/i },
  { name: 'Rippling', midL: 50, re: /\brippling\b/i },
  { name: 'Confluent', midL: 45, re: /\bconfluent\b/i },
  { name: 'Rubrik', midL: 42, re: /\brubrik\b/i },
  { name: 'Nutanix', midL: 40, re: /\bnutanix\b/i },
  { name: 'Palo Alto Networks', midL: 40, re: /\bpalo alto\b/i },
  { name: 'MongoDB', midL: 38, re: /\bmongodb\b/i },
  { name: 'HashiCorp', midL: 40, re: /\bhashicorp\b/i },
  { name: 'GitHub', midL: 40, re: /\bgithub\b/i },
  { name: 'ServiceNow', midL: 35, re: /\bservicenow\b/i },
  { name: 'Intuit', midL: 40, re: /\bintuit\b/i },
  { name: 'PayPal', midL: 28, re: /\bpaypal\b/i },
  { name: 'Expedia', midL: 35, re: /\bexpedia\b/i },
  { name: 'VMware', midL: 30, re: /\bvmware\b/i },
  { name: 'SAP Labs', midL: 24, re: /\bsap( labs)?\b/i },
  { name: 'Oracle', midL: 22, re: /\boracle\b/i },
  { name: 'Cisco', midL: 24, re: /\bcisco\b/i },
  { name: 'Qualcomm', midL: 26, re: /\bqualcomm\b/i },
  { name: 'Walmart Global Tech', midL: 26, re: /\bwalmart\b/i },
  { name: 'Visa', midL: 30, re: /\bvisa\b/i },
  { name: 'Mastercard', midL: 28, re: /\bmastercard\b/i },
  { name: 'Samsung R&D', midL: 22, re: /\bsamsung\b/i },
  { name: 'MediaTek', midL: 26, re: /\bmediatek\b/i },
  { name: 'Texas Instruments', midL: 26, re: /\btexas instruments\b/i },
  { name: 'Intel', midL: 26, re: /\bintel\b/i },
  { name: 'AMD', midL: 26, re: /\bamd\b/i },
  { name: 'Sprinklr', midL: 24, re: /\bsprinklr\b/i },

  // ── Finance / quant / HFT ──
  { name: 'Optiver', midL: 70, re: /\boptiver\b/i },
  { name: 'Jane Street', midL: 70, re: /\bjane street\b/i },
  { name: 'Citadel', midL: 65, re: /\bcitadel\b/i },
  { name: 'Tower Research', midL: 55, re: /\btower research\b/i },
  { name: 'Graviton', midL: 55, re: /\bgraviton\b/i },
  { name: 'Squarepoint', midL: 55, re: /\bsquarepoint\b/i },
  { name: 'D. E. Shaw', midL: 50, re: /\bde ?shaw\b/i },
  { name: 'WorldQuant', midL: 40, re: /\bworldquant\b/i },
  { name: 'Goldman Sachs', midL: 32, re: /\bgoldman\b/i },
  { name: 'Morgan Stanley', midL: 30, re: /\bmorgan stanley\b/i },
  { name: 'JPMorgan', midL: 24, re: /\b(jpmorgan|jp morgan|j\.?p\.? morgan)\b/i },
  { name: 'American Express', midL: 24, re: /\b(american express|amex)\b/i },
  { name: 'Deutsche Bank', midL: 22, re: /\bdeutsche\b/i },
  { name: 'Barclays', midL: 22, re: /\bbarclays\b/i },
  { name: 'Nomura', midL: 22, re: /\bnomura\b/i },
  { name: 'Citi', midL: 22, re: /\bciti(bank|group)?\b/i },
  { name: 'Wells Fargo', midL: 20, re: /\bwells fargo\b/i },
  { name: 'UBS', midL: 20, re: /\bubs\b/i },
  { name: 'HSBC', midL: 18, re: /\bhsbc\b/i },
  { name: 'Arcesium', midL: 40, re: /\barcesium\b/i },

  // ── Indian unicorns / product / fintech ──
  { name: 'Razorpay', midL: 40, re: /\brazorpay\b/i },
  { name: 'CRED', midL: 40, re: /\bcred\b/i },
  { name: 'Dream11', midL: 40, re: /\b(dream ?11|dream sports)\b/i },
  { name: 'Flipkart', midL: 38, re: /\bflipkart\b/i },
  { name: 'PhonePe', midL: 38, re: /\bphonepe\b/i },
  { name: 'Groww', midL: 35, re: /\bgroww\b/i },
  { name: 'Postman', midL: 35, re: /\bpostman\b/i },
  { name: 'Swiggy', midL: 32, re: /\bswiggy\b/i },
  { name: 'Zomato', midL: 32, re: /\b(zomato|eternal)\b/i },
  { name: 'Meesho', midL: 32, re: /\bmeesho\b/i },
  { name: 'ShareChat', midL: 30, re: /\bsharechat\b/i },
  { name: 'BrowserStack', midL: 30, re: /\bbrowserstack\b/i },
  { name: 'Zerodha', midL: 30, re: /\bzerodha\b/i },
  { name: 'Navi', midL: 30, re: /\bnavi\b/i },
  { name: 'InMobi', midL: 28, re: /\binmobi\b/i },
  { name: 'Slice', midL: 28, re: /\bslice\b/i },
  { name: 'Zeta', midL: 28, re: /\bzeta\b/i },
  { name: 'Urban Company', midL: 26, re: /\burban company\b/i },
  { name: 'Jupiter', midL: 26, re: /\bjupiter\b/i },
  { name: 'Angel One', midL: 24, re: /\bangel one\b/i },
  { name: 'Nykaa', midL: 22, re: /\bnykaa\b/i },
  { name: 'Paytm', midL: 20, re: /\bpaytm\b/i },
  { name: 'Freshworks', midL: 18, re: /\bfreshworks\b/i },
  { name: 'Myntra', midL: 20, re: /\bmyntra\b/i },
  { name: 'Delhivery', midL: 18, re: /\bdelhivery\b/i },
  { name: 'Ola', midL: 17, re: /\bola\b/i },
  { name: 'Unacademy', midL: 16, re: /\bunacademy\b/i },
  { name: 'PhysicsWallah', midL: 16, re: /\b(physicswallah|physics wallah|pw\b)\b/i },
  { name: "Byju's", midL: 13, re: /\bbyju'?s?\b/i },
  { name: 'Zoho', midL: 13, re: /\bzoho\b/i },

  // ── IT services / consulting (lower band) ──
  { name: 'Accenture', midL: 14, re: /\baccenture\b/i },
  { name: 'IBM', midL: 16, re: /\bibm\b/i },
  { name: 'Deloitte', midL: 16, re: /\bdeloitte\b/i },
  { name: 'PwC', midL: 15, re: /\b(pwc|pricewaterhouse)\b/i },
  { name: 'EY', midL: 15, re: /\b(ernst ?& ?young|ey\b)\b/i },
  { name: 'KPMG', midL: 14, re: /\bkpmg\b/i },
  { name: 'ThoughtWorks', midL: 20, re: /\bthoughtworks\b/i },
  { name: 'Publicis Sapient', midL: 18, re: /\b(publicis sapient|sapient)\b/i },
  { name: 'EPAM', midL: 20, re: /\bepam\b/i },
  { name: 'Nagarro', midL: 16, re: /\bnagarro\b/i },
  { name: 'GlobalLogic', midL: 16, re: /\bgloballogic\b/i },
  { name: 'DXC', midL: 12, re: /\bdxc\b/i },
  { name: 'Cognizant', midL: 11, re: /\bcognizant\b/i },
  { name: 'Capgemini', midL: 11, re: /\bcapgemini\b/i },
  { name: 'HCLTech', midL: 11, re: /\bhcl(tech)?\b/i },
  { name: 'Tech Mahindra', midL: 10, re: /\btech mahindra\b/i },
  { name: 'LTIMindtree', midL: 12, re: /\b(ltimindtree|mindtree|l&t infotech|lti)\b/i },
  { name: 'Persistent', midL: 12, re: /\bpersistent\b/i },
  { name: 'Coforge', midL: 12, re: /\bcoforge\b/i },
  { name: 'Mphasis', midL: 12, re: /\bmphasis\b/i },
  { name: 'Hexaware', midL: 12, re: /\bhexaware\b/i },
  { name: 'Virtusa', midL: 12, re: /\bvirtusa\b/i },
  { name: 'Zensar', midL: 11, re: /\bzensar\b/i },
  { name: 'Birlasoft', midL: 11, re: /\bbirlasoft\b/i },
  { name: 'NTT Data', midL: 13, re: /\bntt ?data\b/i },
  { name: 'TCS', midL: 9, re: /\b(tcs|tata consultancy)\b/i },
  { name: 'Infosys', midL: 9, re: /\binfosys\b/i },
  { name: 'Wipro', midL: 9, re: /\bwipro\b/i },
  { name: 'Genpact', midL: 10, re: /\bgenpact\b/i },
  { name: 'WNS', midL: 9, re: /\bwns\b/i },
];

export interface CompanyHit {
  name: string;
  factor: number;
  midL: number;
}

/** Find a known employer in the page text and return its pay factor. */
export function findCompany(text: string): CompanyHit | null {
  for (const c of COMPANIES) {
    if (c.re.test(text)) return { name: c.name, factor: c.midL / BASELINE_L, midL: c.midL };
  }
  return null;
}
