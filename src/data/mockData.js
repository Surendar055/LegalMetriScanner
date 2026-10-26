/**
 * Exact mock data for LegalMetriScan matching reference UI
 */

export const INITIAL_INSPECTIONS = [
  {
    id: "1",
    productName: "Premium Basmati Rice (1kg)",
    timestamp: "2026-10-24T10:24:00Z",
    displayDate: "24/10/26",
    status: "Compliant",
    score: 98,
    barcode: "8901030829141",
    category: "Food & Grain",
    details: {
      mrp: "₹120",
      mrpRaw: "₹120.00 (Incl. of all taxes)",
      netQuantity: "1 kg",
      manufacturer: "ABC Foods Pvt. Ltd.",
      address: "Plot 12, Industrial Estate, Chennai, Tamil Nadu - 600001",
      customerCare: "+91 98765 43210",
      countryOfOrigin: "India",
      mfgDate: "08/2026",
      fssaiNumber: "10014022002789"
    },
    verifications: [
      { field: "MRP", value: "₹120", found: true },
      { field: "Net Quantity", value: "1 kg", found: true },
      { field: "Manufacturer", value: "ABC Foods Pvt. Ltd.", found: true },
      { field: "Address", value: "Chennai, Tamil Nadu", found: true },
      { field: "Customer Care", value: "+91 98765 43210", found: true }
    ],
    evidenceImageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "2",
    productName: "Marie Gold Biscuit (250g)",
    timestamp: "2026-10-24T11:45:00Z",
    displayDate: "24/10/26",
    status: "Compliant",
    score: 95,
    barcode: "8901063142211",
    category: "Bakery & Biscuits",
    details: {
      mrp: "₹35",
      mrpRaw: "₹35.00 (Incl. of all taxes)",
      netQuantity: "250 g",
      manufacturer: "Britannia Industries Ltd.",
      address: "5/1A Hungerford Street, Kolkata - 700017",
      customerCare: "1800-425-4449",
      countryOfOrigin: "India",
      mfgDate: "09/2026",
      fssaiNumber: "10015043001129"
    },
    verifications: [
      { field: "MRP", value: "₹35", found: true },
      { field: "Net Quantity", value: "250 g", found: true },
      { field: "Manufacturer", value: "Britannia Industries Ltd.", found: true },
      { field: "Address", value: "Kolkata, West Bengal", found: true },
      { field: "Customer Care", value: "1800-425-4449", found: true }
    ],
    evidenceImageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "3",
    productName: "Choco Chip Cookies Biscuit (200g)",
    timestamp: "2026-10-25T14:30:00Z",
    displayDate: "25/10/26",
    status: "Non-Compliant",
    score: 42,
    barcode: "8904001289451",
    category: "Bakery & Biscuits",
    details: {
      mrp: "₹40",
      mrpRaw: "MRP 40 (Dual stickered)",
      netQuantity: "200 g",
      manufacturer: "BakeWell Confectioners",
      address: "Incomplete Address",
      customerCare: "Not Found",
      countryOfOrigin: "India",
      mfgDate: "06/2026",
      fssaiNumber: "10017042003310"
    },
    verifications: [
      { field: "MRP", value: "₹40", found: false, note: "Dual pricing detected" },
      { field: "Net Quantity", value: "200 g", found: true },
      { field: "Manufacturer", value: "BakeWell Confectioners", found: true },
      { field: "Address", value: "Not Declared", found: false },
      { field: "Customer Care", value: "Not Found", found: false }
    ],
    evidenceImageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "4",
    productName: "Wheat Flour Atta (5kg)",
    timestamp: "2026-10-25T16:15:00Z",
    displayDate: "25/10/26",
    status: "Attention Required",
    score: 72,
    barcode: "8902011993420",
    category: "Food & Grain",
    details: {
      mrp: "₹240",
      mrpRaw: "MRP ₹240/-",
      netQuantity: "5 kg",
      manufacturer: "Kisan Agro Mills Ltd.",
      address: "Chennai, Tamil Nadu",
      customerCare: "+91 98765 43210",
      countryOfOrigin: "India",
      mfgDate: "07/2026",
      fssaiNumber: "10016021002245"
    },
    verifications: [
      { field: "MRP", value: "₹240", found: true },
      { field: "Net Quantity", value: "5 kg", found: true },
      { field: "Manufacturer", value: "Kisan Agro Mills Ltd.", found: true },
      { field: "Address", value: "Chennai, Tamil Nadu", found: false, note: "Full postal address with PIN missing" },
      { field: "Customer Care", value: "+91 98765 43210", found: true }
    ],
    evidenceImageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "5",
    productName: "Refined Sunflower Cooking Oil (1L)",
    timestamp: "2026-10-26T09:20:00Z",
    displayDate: "26/10/26",
    status: "Compliant",
    score: 96,
    barcode: "8901239847120",
    category: "Edible Oil",
    details: {
      mrp: "₹185",
      mrpRaw: "₹185.00 (Incl. of all taxes)",
      netQuantity: "1 L",
      manufacturer: "SunPure Refineries Pvt. Ltd.",
      address: "Phase 2, GIDC, Vadodara, Gujarat - 390010",
      customerCare: "1800-200-4321",
      countryOfOrigin: "India",
      mfgDate: "09/2026",
      fssaiNumber: "10018011005520"
    },
    verifications: [
      { field: "MRP", value: "₹185", found: true },
      { field: "Net Quantity", value: "1 L", found: true },
      { field: "Manufacturer", value: "SunPure Refineries Pvt. Ltd.", found: true },
      { field: "Address", value: "Vadodara, Gujarat", found: true },
      { field: "Customer Care", value: "1800-200-4321", found: true }
    ],
    evidenceImageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80"
  }
];

export const STATS_DATA = {
  total: { value: 42, change: "+ 12%", label: "Total Inspections", timeFrame: "vs. last 7 days" },
  compliant: { value: 31, change: "+ 74%", label: "Compliant", timeFrame: "vs. last 7 days" },
  attention: { value: 7, change: "+ 17%", label: "Attention Required", timeFrame: "vs. last 7 days" },
  nonCompliant: { value: 4, change: "+ 10%", label: "Non-Compliant", timeFrame: "vs. last 7 days" },
};

export const MOBILE_DEFAULT_VERIFICATION = {
  status: "Attention Required",
  statusNote: "Some required information is missing or needs verification.",
  productName: "Premium Rice (1kg)",
  capturedImage: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
  fields: [
    { id: "mrp", label: "MRP", value: "₹120", status: "Found", isFound: true },
    { id: "netQty", label: "Net Quantity", value: "1 kg", status: "Found", isFound: true },
    { id: "mfg", label: "Manufacturer", value: "ABC Foods Pvt. Ltd.", status: "Found", isFound: true },
    { id: "address", label: "Address", value: "Chennai, Tamil Nadu", status: "Not Found", isFound: false },
    { id: "care", label: "Customer Care", value: "+91 98765 43210", status: "Found", isFound: true },
  ]
};

export const CONNECTED_DEVICE_DEFAULT = {
  id: "SCANNER-NODE-4089",
  name: "Mobile Scanner",
  assignedInspector: "Inspector Devendra Sharma",
  status: "Waiting for device...",
  battery: 88,
  signalStrength: -62,
  latencyMs: 14,
  lastHeartbeat: "Waiting for connection",
  qrPairingCode: "LMS-PAIR-9082-DEL-04"
};

export const MOCK_SCAN_TEMPLATES = [
  {
    productName: "Premium Rice (1kg)",
    barcode: "8901030829141",
    category: "Food & Grain",
    status: "Compliant",
    score: 98,
    details: {
      mrp: "₹120",
      mrpRaw: "₹120.00 (Incl. of all taxes)",
      netQuantity: "1 kg",
      manufacturer: "ABC Foods Pvt. Ltd.",
      address: "Chennai, Tamil Nadu",
      customerCare: "+91 98765 43210"
    },
    evidenceImageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"
  },
  {
    productName: "Wheat Flour (5kg)",
    barcode: "8902011993420",
    category: "Food & Grain",
    status: "Attention Required",
    score: 72,
    details: {
      mrp: "₹240",
      mrpRaw: "₹240.00",
      netQuantity: "5 kg",
      manufacturer: "Kisan Agro Mills Ltd.",
      address: "Chennai, Tamil Nadu",
      customerCare: "+91 98765 43210"
    },
    evidenceImageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"
  }
];

