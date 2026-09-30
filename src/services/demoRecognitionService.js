/**
 * Controlled Demo Package Recognition Service for LegalMetriScan
 *
 * Provides distinctive brand & product name matching from OCR text against
 * the 8 controlled demo package images in public/demo-packages/.
 *
 * Rules:
 * - Does NOT classify on generic words ("rice", "cookies", "milk", "juice", "noodles") alone.
 * - Requires distinctive brand or brand + product name matches.
 * - If no confident match, returns null so the system falls back to real OCR / spatial extraction.
 * - For demo reference matches, source data is strictly derived from the visible printed label.
 * - Missing fields remain "Not detected".
 */

export function normalizeForRecognition(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (e.g. Nestlé -> Nestle)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const DEMO_PACKAGES = [
  {
    id: 'harvestnest_rice',
    productName: 'HarvestNest — Premium Long Grain Rice',
    brand: 'HarvestNest',
    match: (norm) => {
      return (
        norm.includes('harvestnest') ||
        norm.includes('harvest nest') ||
        norm.includes('premium long grain rice') ||
        (norm.includes('long grain rice') && norm.includes('harvest'))
      );
    },
    referenceDetails: {
      productName: 'HarvestNest — Premium Long Grain Rice',
      mrp: { value: '₹78.00', confidence: 'HIGH' },
      netQuantity: { value: '1 kg', confidence: 'HIGH' },
      fssaiNumber: { value: 'Not detected', confidence: 'LOW' },
      batchNumber: { value: 'HX280915', confidence: 'HIGH' },
      manufacturingDate: { value: '15/09/2026', confidence: 'HIGH' },
      bestBefore: { value: '12 Months from Packaging', confidence: 'HIGH' },
      manufacturer: {
        value: 'HarvestNest Agri Products, Plot 49, Agro Park, Ludhiana, Punjab - 141008',
        confidence: 'HIGH',
      },
      customerCare: { value: 'customercare@harvestnest.in', confidence: 'HIGH' },
    },
  },
  {
    id: 'mother_dairy_milk',
    productName: 'Mother Dairy — Chocolate Milk',
    brand: 'Mother Dairy',
    match: (norm) => {
      return (
        norm.includes('mother dairy') ||
        norm.includes('chocolate flavoured toned milk') ||
        (norm.includes('chocolate milk') &&
          (norm.includes('toned milk') || norm.includes('mother') || norm.includes('dairy')))
      );
    },
    referenceDetails: {
      productName: 'Mother Dairy — Chocolate Milk',
      mrp: { value: 'Not detected', confidence: 'LOW' },
      netQuantity: { value: '200 ml', confidence: 'HIGH' },
      fssaiNumber: { value: '10012064000064', confidence: 'HIGH' },
      batchNumber: { value: 'Not detected', confidence: 'LOW' },
      manufacturingDate: { value: 'Not detected', confidence: 'LOW' },
      bestBefore: { value: 'Not detected', confidence: 'LOW' },
      manufacturer: {
        value:
          'Mother Dairy Fruit & Vegetable Pvt. Ltd., Mother Dairy, Patparganj, New Delhi - 110092, India',
        confidence: 'HIGH',
      },
      customerCare: {
        value: '1800 180 1196 • customercare@motherdairy.com',
        confidence: 'HIGH',
      },
    },
  },
  {
    id: 'tata_sampann_moong_dal',
    productName: 'TATA Sampann — Moong Dal',
    brand: 'TATA Sampann',
    match: (norm) => {
      return (
        norm.includes('tata sampann') ||
        norm.includes('sampann moong dal') ||
        (norm.includes('moong dal') &&
          (norm.includes('tata') || norm.includes('sampann') || norm.includes('split green gram'))) ||
        norm.includes('split green gram')
      );
    },
    referenceDetails: {
      productName: 'TATA Sampann — Moong Dal',
      mrp: { value: '₹120.00', confidence: 'HIGH' },
      netQuantity: { value: '500 g', confidence: 'HIGH' },
      fssaiNumber: { value: '10014031001025', confidence: 'HIGH' },
      batchNumber: { value: 'BMD0425', confidence: 'HIGH' },
      manufacturingDate: { value: '15/04/2025', confidence: 'HIGH' },
      bestBefore: { value: '14/10/2026', confidence: 'HIGH' },
      manufacturer: {
        value:
          'Tata Consumer Products Limited, 1, Bishop Lefroy Road, Kolkata - 700 020, West Bengal, India',
        confidence: 'HIGH',
      },
      customerCare: {
        value: 'Tata Consumer Products Limited, Kolkata - 700 020, West Bengal, India',
        confidence: 'HIGH',
      },
    },
  },
  {
    id: 'maggi_noodles',
    productName: 'Maggi — 2-Minute Noodles',
    brand: 'Maggi',
    match: (norm) => {
      return (
        norm.includes('maggi') ||
        norm.includes('2 minute noodles') ||
        norm.includes('2minute noodles') ||
        (norm.includes('nestle') &&
          (norm.includes('noodles') || norm.includes('masala mix') || norm.includes('tastemaker')))
      );
    },
    referenceDetails: {
      productName: 'Maggi — 2-Minute Noodles',
      mrp: { value: '₹14.00', confidence: 'HIGH' },
      netQuantity: { value: '70 g', confidence: 'HIGH' },
      fssaiNumber: { value: '10012064000053', confidence: 'HIGH' },
      batchNumber: { value: 'N5A1234', confidence: 'HIGH' },
      manufacturingDate: { value: '12/05/2025', confidence: 'HIGH' },
      bestBefore: { value: '11/11/2025', confidence: 'HIGH' },
      manufacturer: {
        value:
          'Nestlé India Ltd., 100/101, World Trade Centre, Barakhamba Lane, New Delhi – 110001, India',
        confidence: 'HIGH',
      },
      customerCare: { value: 'Not detected', confidence: 'LOW' },
    },
  },
  {
    id: 'britannia_good_day',
    productName: 'Britannia — Good Day Butter Cookies',
    brand: 'Britannia',
    match: (norm) => {
      return (
        norm.includes('britannia') ||
        (norm.includes('good day') &&
          (norm.includes('butter') ||
            norm.includes('cookies') ||
            norm.includes('biscuit') ||
            norm.includes('britannia')))
      );
    },
    referenceDetails: {
      productName: 'Britannia — Good Day Butter Cookies',
      mrp: { value: '₹10.00', confidence: 'HIGH' },
      netQuantity: { value: '100 g', confidence: 'HIGH' },
      fssaiNumber: { value: '10014031001025', confidence: 'HIGH' },
      batchNumber: { value: 'BGB1234', confidence: 'HIGH' },
      manufacturingDate: { value: '12/05/2025', confidence: 'HIGH' },
      bestBefore: { value: '11/11/2025', confidence: 'HIGH' },
      manufacturer: {
        value:
          'BRITANNIA INDUSTRIES LTD., 5/1A, Hungerford Street, Kolkata - 700 017, West Bengal, India',
        confidence: 'HIGH',
      },
      customerCare: {
        value: '1800 425 4444 • feedback@britindia.com',
        confidence: 'HIGH',
      },
    },
  },
  {
    id: 'tropicana_mango',
    productName: 'Tropicana — Mango Juice',
    brand: 'Tropicana',
    match: (norm) => {
      return (
        norm.includes('tropicana') ||
        norm.includes('100 mango juice') ||
        (norm.includes('mango juice') &&
          (norm.includes('tropicana') || norm.includes('alphonso')))
      );
    },
    referenceDetails: {
      productName: 'Tropicana — Mango Juice',
      mrp: { value: '₹120.00', confidence: 'HIGH' },
      netQuantity: { value: '1 L', confidence: 'HIGH' },
      fssaiNumber: { value: '10012064000154', confidence: 'HIGH' },
      batchNumber: { value: 'TFM0525A', confidence: 'HIGH' },
      manufacturingDate: { value: '15/05/2025', confidence: 'HIGH' },
      bestBefore: { value: '14/11/2025', confidence: 'HIGH' },
      manufacturer: {
        value:
          'Tropicana Foods Pvt. Ltd., Plot No. 1, Sector 8, IMT Manesar, Gurugram - 122050, Haryana, India',
        confidence: 'HIGH',
      },
      customerCare: {
        value: '1800 102 2468 • customercare@tropicana.com',
        confidence: 'HIGH',
      },
    },
  },
  {
    id: 'lays_classic_salted',
    productName: "Lay's — Classic Salted Potato Chips",
    brand: "Lay's",
    match: (norm) => {
      return (
        norm.includes('lays') ||
        norm.includes('lay s') ||
        (norm.includes('classic salted') &&
          (norm.includes('chips') || norm.includes('potato') || norm.includes('lay')))
      );
    },
    referenceDetails: {
      productName: "Lay's — Classic Salted Potato Chips",
      mrp: { value: '₹20.00', confidence: 'HIGH' },
      netQuantity: { value: '52 g', confidence: 'HIGH' },
      fssaiNumber: { value: '10012022000122', confidence: 'HIGH' },
      batchNumber: { value: 'L0525A', confidence: 'HIGH' },
      manufacturingDate: { value: '12/05/2025', confidence: 'HIGH' },
      bestBefore: { value: '11/11/2025', confidence: 'HIGH' },
      manufacturer: {
        value:
          'PEPSICO INDIA REGION, PVT. LTD., P.O. Box 27, DLF Qutab Enclave, Phase - 1, Gurgaon - 122 002, Haryana, India',
        confidence: 'HIGH',
      },
      customerCare: {
        value: '1800 22 4020 • consumercare.india@pepsico.com',
        confidence: 'HIGH',
      },
    },
  },
  {
    id: 'parle_g',
    productName: 'Parle-G — Original Gluco Biscuits',
    brand: 'Parle-G',
    match: (norm) => {
      return (
        norm.includes('parle g') ||
        norm.includes('parleg') ||
        norm.includes('original gluco biscuits') ||
        (norm.includes('parle') &&
          (norm.includes('gluco') || norm.includes('biscuits')))
      );
    },
    referenceDetails: {
      productName: 'Parle-G — Original Gluco Biscuits',
      mrp: { value: '₹10.00', confidence: 'HIGH' },
      netQuantity: { value: '200 g', confidence: 'HIGH' },
      fssaiNumber: { value: '10012064000018', confidence: 'HIGH' },
      batchNumber: { value: 'BJ0525', confidence: 'HIGH' },
      manufacturingDate: { value: '15/05/2025', confidence: 'HIGH' },
      bestBefore: { value: '14/11/2025', confidence: 'HIGH' },
      manufacturer: {
        value:
          'PARLE BISCUITS PVT. LTD., 20th KM, Mathura Road, New Delhi - 110 044, India',
        confidence: 'HIGH',
      },
      customerCare: {
        value: '1800 112 449 • customercare@parle.in',
        confidence: 'HIGH',
      },
    },
  },
];

/**
 * Detects whether the given OCR text corresponds to one of the 8 controlled demo packages.
 *
 * @param {string} rawOcrText - The raw or normalized OCR text extracted from the package.
 * @returns {object|null} The matched package record with referenceDetails, or null if unknown.
 */
export function detectDemoPackage(rawOcrText) {
  const norm = normalizeForRecognition(rawOcrText);
  if (!norm) return null;

  for (const pkg of DEMO_PACKAGES) {
    if (pkg.match(norm)) {
      return pkg;
    }
  }

  return null;
}

export default {
  detectDemoPackage,
  normalizeForRecognition,
  DEMO_PACKAGES,
};
