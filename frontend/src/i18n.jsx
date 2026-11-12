import { createContext, useContext, useEffect, useState } from 'react'

const strings = {
  en: {
    appName: 'Smart Garbage',
    ward: 'Hongasandra Ward · Pilot',

    connecting: 'Connecting to server…',
    connectingHint: 'The first connection can take up to a minute.',
    serverDown: 'Could not reach the server. Check your internet connection and try again.',
    retry: 'Try again',
    genericError: 'Something went wrong. Please try again.',

    homeTitle: 'Waste handover',
    homeText: 'Scan the QR code on the garbage collection vehicle to submit your waste handover.',
    officerLink: 'Officer login',

    invalidQr: 'This QR code is not linked to any vehicle.',
    vehicle: 'Vehicle',

    meterTitle: 'Enter your meter number',
    meterHint: 'Use the number on your electricity meter box. If your household is registered, your details are filled in automatically.',
    continue: 'Continue',
    checking: 'Checking…',
    change: 'Change',
    back: 'Back',

    registerTitle: 'Register your household',
    notRegistered: 'This meter number is not registered yet. Fill in your details once to continue.',
    name: 'Resident name',
    meter: 'Electricity meter box number',
    mobile: 'Mobile number',
    mobileInvalid: 'Enter a valid 10-digit mobile number.',
    street: 'Street / layout',
    address: 'House address',
    registerBtn: 'Register and continue',
    saving: 'Saving…',
    meterTaken: 'This meter number is already registered with a different mobile number. Please contact the ward officer.',
    checkFields: 'Please check the highlighted fields.',

    handoverTitle: 'Waste handover',
    household: 'Household',
    wasteType: 'Waste type',
    wet: 'Wet',
    dry: 'Dry',
    mixed: 'Mixed',
    photo: 'Photo of handover',
    photoHint: 'Show the waste being handed over to the vehicle.',
    takePhoto: 'Take photo',
    retake: 'Retake',
    photoError: 'Could not read this photo. Please take it again.',
    location: 'Location',
    locating: 'Getting location…',
    located: 'Location captured',
    noLocation: 'Location not available. You can still submit.',
    submit: 'Submit',
    submitting: 'Submitting…',
    needWaste: 'Select the waste type',
    needPhoto: 'Take a photo of the handover',

    doneTitle: 'Submitted',
    doneText: 'Thank you. Your waste handover has been recorded.',
    submitAnother: 'Submit another',

    loginTitle: 'Officer login',
    loginHint: 'Sign in to view waste handovers in your ward.',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    login: 'Log in',
    loggingIn: 'Logging in…',
    invalidLogin: 'Incorrect email or password.',
    logout: 'Log out',

    dashboard: 'Officer dashboard',
    date: 'Date',
    households: 'Registered households',
    submissions: 'Submissions',
    householdsCovered: 'Households covered: {n}',
    withGps: 'With GPS',
    noGps: 'No GPS',
    byWaste: 'By waste type',
    byStreet: 'Street-wise',
    noDataRange: 'No submissions in this period.',
    noResults: 'No submissions match these filters.',
    searchAll: 'Search name, meter, mobile, street…',
    all: 'All',
    clearFilters: 'Clear filters',
    filters: 'Filters',
    anyWaste: 'Any type',
    anyGps: 'Any',
    anyStreet: 'Any street',
    anyVehicle: 'Any vehicle',
    exportCsv: 'Download CSV',
    exporting: 'Preparing…',
    showing: 'Showing {from}–{to} of {total}',
    rowsPerPage: 'Rows per page',
    auto: 'Auto',
    pagination: 'Pages',

    today: 'Today',
    yesterday: 'Yesterday',
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    allTime: 'All time',
    pickEnd: 'Now pick the end date',
    submissionsCount: '{n} submissions',
    oneSubmission: '1 submission',
    noSubmissionsDay: 'No submissions',
    apply: 'Apply',
    cancel: 'Cancel',
    prev: 'Previous',
    next: 'Next',
    loading: 'Loading…',

    col_photo: 'Photo',
    col_time: 'Time',
    col_name: 'Resident',
    col_meter_no: 'Meter No.',
    col_street: 'Street',
    col_waste_type: 'Waste',
    col_vehicle_no: 'Vehicle',
    col_gps: 'GPS',
    gpsYes: 'Yes',

    details: 'Submission details',
    openMap: 'Open in Google Maps',
    close: 'Close',

    vehiclesTab: 'Vehicles & QR',
    addVehicle: 'Add vehicle',
    addVehicleHint: 'Each vehicle gets its own QR code. Print it and stick it on the vehicle.',
    vehicleNo: 'Vehicle number',
    add: 'Add',
    adding: 'Adding…',
    vehicleAdded: '{no} added. Its QR code is below.',
    vehicleExists: 'This vehicle is already added.',
    invalidVehicleNo: 'Enter the vehicle number using letters and numbers, e.g. KA 01 AB 1234.',
    noVehicles: 'No vehicles yet.',
    vehiclesList: 'Vehicles',
    downloadPng: 'Download PNG',
    print: 'Print',
  },

  kn: {
    appName: 'ಸ್ಮಾರ್ಟ್ ಕಸ ಸಂಗ್ರಹ',
    ward: 'ಹೊಂಗಸಂದ್ರ ವಾರ್ಡ್ · ಪ್ರಾಯೋಗಿಕ',

    connecting: 'ಸರ್ವರ್‌ಗೆ ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ…',
    connectingHint: 'ಮೊದಲ ಸಂಪರ್ಕಕ್ಕೆ ಒಂದು ನಿಮಿಷದವರೆಗೆ ಬೇಕಾಗಬಹುದು.',
    serverDown: 'ಸರ್ವರ್ ತಲುಪಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    genericError: 'ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',

    homeTitle: 'ಕಸ ಹಸ್ತಾಂತರ',
    homeText: 'ಕಸ ಹಸ್ತಾಂತರ ಸಲ್ಲಿಸಲು ಕಸ ಸಂಗ್ರಹ ವಾಹನದ ಮೇಲಿರುವ QR ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
    officerLink: 'ಅಧಿಕಾರಿ ಲಾಗಿನ್',

    invalidQr: 'ಈ QR ಕೋಡ್ ಯಾವುದೇ ವಾಹನಕ್ಕೆ ಸಂಬಂಧಿಸಿಲ್ಲ.',
    vehicle: 'ವಾಹನ',

    meterTitle: 'ನಿಮ್ಮ ಮೀಟರ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ',
    meterHint: 'ನಿಮ್ಮ ವಿದ್ಯುತ್ ಮೀಟರ್ ಬಾಕ್ಸ್‌ನಲ್ಲಿರುವ ಸಂಖ್ಯೆಯನ್ನು ಬಳಸಿ. ನಿಮ್ಮ ಮನೆ ನೋಂದಾಯಿತವಾಗಿದ್ದರೆ, ವಿವರಗಳು ತಾನಾಗಿಯೇ ತುಂಬಲ್ಪಡುತ್ತವೆ.',
    continue: 'ಮುಂದುವರಿಯಿರಿ',
    checking: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
    change: 'ಬದಲಿಸಿ',
    back: 'ಹಿಂದೆ',

    registerTitle: 'ನಿಮ್ಮ ಮನೆಯನ್ನು ನೋಂದಾಯಿಸಿ',
    notRegistered: 'ಈ ಮೀಟರ್ ಸಂಖ್ಯೆ ಇನ್ನೂ ನೋಂದಾಯಿತವಾಗಿಲ್ಲ. ಮುಂದುವರಿಯಲು ಒಮ್ಮೆ ನಿಮ್ಮ ವಿವರಗಳನ್ನು ತುಂಬಿ.',
    name: 'ನಿವಾಸಿಯ ಹೆಸರು',
    meter: 'ವಿದ್ಯುತ್ ಮೀಟರ್ ಬಾಕ್ಸ್ ಸಂಖ್ಯೆ',
    mobile: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    mobileInvalid: 'ಸರಿಯಾದ 10 ಅಂಕೆಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.',
    street: 'ರಸ್ತೆ / ಲೇಔಟ್',
    address: 'ಮನೆಯ ವಿಳಾಸ',
    registerBtn: 'ನೋಂದಾಯಿಸಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ',
    saving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…',
    meterTaken: 'ಈ ಮೀಟರ್ ಸಂಖ್ಯೆ ಬೇರೆ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ಈಗಾಗಲೇ ನೋಂದಾಯಿತವಾಗಿದೆ. ದಯವಿಟ್ಟು ವಾರ್ಡ್ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    checkFields: 'ಗುರುತಿಸಲಾದ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',

    handoverTitle: 'ಕಸ ಹಸ್ತಾಂತರ',
    household: 'ಮನೆ',
    wasteType: 'ತ್ಯಾಜ್ಯದ ವಿಧ',
    wet: 'ಹಸಿ ಕಸ',
    dry: 'ಒಣ ಕಸ',
    mixed: 'ಮಿಶ್ರ ಕಸ',
    photo: 'ಹಸ್ತಾಂತರದ ಫೋಟೋ',
    photoHint: 'ವಾಹನಕ್ಕೆ ಕಸ ನೀಡುತ್ತಿರುವುದನ್ನು ತೋರಿಸಿ.',
    takePhoto: 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    retake: 'ಮತ್ತೆ ತೆಗೆಯಿರಿ',
    photoError: 'ಈ ಫೋಟೋವನ್ನು ಓದಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ತೆಗೆಯಿರಿ.',
    location: 'ಸ್ಥಳ',
    locating: 'ಸ್ಥಳ ಪಡೆಯಲಾಗುತ್ತಿದೆ…',
    located: 'ಸ್ಥಳ ದಾಖಲಾಗಿದೆ',
    noLocation: 'ಸ್ಥಳ ಲಭ್ಯವಿಲ್ಲ. ಆದರೂ ನೀವು ಸಲ್ಲಿಸಬಹುದು.',
    submit: 'ಸಲ್ಲಿಸಿ',
    submitting: 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ…',
    needWaste: 'ತ್ಯಾಜ್ಯದ ವಿಧವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    needPhoto: 'ಹಸ್ತಾಂತರದ ಫೋಟೋ ತೆಗೆಯಿರಿ',

    doneTitle: 'ಸಲ್ಲಿಸಲಾಗಿದೆ',
    doneText: 'ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಕಸ ಹಸ್ತಾಂತರ ದಾಖಲಾಗಿದೆ.',
    submitAnother: 'ಇನ್ನೊಂದು ಸಲ್ಲಿಸಿ',

    loginTitle: 'ಅಧಿಕಾರಿ ಲಾಗಿನ್',
    loginHint: 'ನಿಮ್ಮ ವಾರ್ಡ್‌ನ ಕಸ ಹಸ್ತಾಂತರಗಳನ್ನು ನೋಡಲು ಲಾಗಿನ್ ಮಾಡಿ.',
    email: 'ಇಮೇಲ್',
    password: 'ಪಾಸ್‌ವರ್ಡ್',
    showPassword: 'ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ',
    hidePassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆಮಾಡಿ',
    login: 'ಲಾಗಿನ್',
    loggingIn: 'ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ…',
    invalidLogin: 'ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ತಪ್ಪಾಗಿದೆ.',
    logout: 'ಲಾಗ್ ಔಟ್',

    dashboard: 'ಅಧಿಕಾರಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    date: 'ದಿನಾಂಕ',
    households: 'ನೋಂದಾಯಿತ ಮನೆಗಳು',
    submissions: 'ಸಲ್ಲಿಕೆಗಳು',
    householdsCovered: 'ಒಳಗೊಂಡ ಮನೆಗಳು: {n}',
    withGps: 'GPS ಸಹಿತ',
    noGps: 'GPS ಇಲ್ಲ',
    byWaste: 'ತ್ಯಾಜ್ಯದ ವಿಧವಾರು',
    byStreet: 'ರಸ್ತೆವಾರು',
    noDataRange: 'ಈ ಅವಧಿಯಲ್ಲಿ ಯಾವುದೇ ಸಲ್ಲಿಕೆಗಳಿಲ್ಲ.',
    noResults: 'ಈ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಹೊಂದುವ ಸಲ್ಲಿಕೆಗಳಿಲ್ಲ.',
    searchAll: 'ಹೆಸರು, ಮೀಟರ್, ಮೊಬೈಲ್, ರಸ್ತೆ ಹುಡುಕಿ…',
    all: 'ಎಲ್ಲಾ',
    clearFilters: 'ಫಿಲ್ಟರ್‌ಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ',
    filters: 'ಫಿಲ್ಟರ್‌ಗಳು',
    anyWaste: 'ಯಾವುದೇ ವಿಧ',
    anyGps: 'ಯಾವುದೇ',
    anyStreet: 'ಯಾವುದೇ ರಸ್ತೆ',
    anyVehicle: 'ಯಾವುದೇ ವಾಹನ',
    exportCsv: 'CSV ಡೌನ್‌ಲೋಡ್',
    exporting: 'ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ…',
    showing: '{total} ರಲ್ಲಿ {from}–{to} ತೋರಿಸಲಾಗುತ್ತಿದೆ',
    rowsPerPage: 'ಪ್ರತಿ ಪುಟಕ್ಕೆ ಸಾಲುಗಳು',
    auto: 'ಸ್ವಯಂ',
    pagination: 'ಪುಟಗಳು',

    today: 'ಇಂದು',
    yesterday: 'ನಿನ್ನೆ',
    last7: 'ಕಳೆದ 7 ದಿನಗಳು',
    last30: 'ಕಳೆದ 30 ದಿನಗಳು',
    thisMonth: 'ಈ ತಿಂಗಳು',
    lastMonth: 'ಕಳೆದ ತಿಂಗಳು',
    allTime: 'ಎಲ್ಲಾ ಅವಧಿ',
    pickEnd: 'ಈಗ ಕೊನೆಯ ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ',
    submissionsCount: '{n} ಸಲ್ಲಿಕೆಗಳು',
    oneSubmission: '1 ಸಲ್ಲಿಕೆ',
    noSubmissionsDay: 'ಸಲ್ಲಿಕೆಗಳಿಲ್ಲ',
    apply: 'ಅನ್ವಯಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    prev: 'ಹಿಂದಿನ',
    next: 'ಮುಂದಿನ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',

    col_photo: 'ಫೋಟೋ',
    col_time: 'ಸಮಯ',
    col_name: 'ನಿವಾಸಿ',
    col_meter_no: 'ಮೀಟರ್ ಸಂಖ್ಯೆ',
    col_street: 'ರಸ್ತೆ',
    col_waste_type: 'ಕಸ',
    col_vehicle_no: 'ವಾಹನ',
    col_gps: 'GPS',
    gpsYes: 'ಹೌದು',

    details: 'ಸಲ್ಲಿಕೆಯ ವಿವರಗಳು',
    openMap: 'Google Maps ನಲ್ಲಿ ತೆರೆಯಿರಿ',
    close: 'ಮುಚ್ಚಿ',

    vehiclesTab: 'ವಾಹನಗಳು ಮತ್ತು QR',
    addVehicle: 'ವಾಹನ ಸೇರಿಸಿ',
    addVehicleHint: 'ಪ್ರತಿ ವಾಹನಕ್ಕೆ ಪ್ರತ್ಯೇಕ QR ಕೋಡ್ ಸಿಗುತ್ತದೆ. ಅದನ್ನು ಮುದ್ರಿಸಿ ವಾಹನಕ್ಕೆ ಅಂಟಿಸಿ.',
    vehicleNo: 'ವಾಹನ ಸಂಖ್ಯೆ',
    add: 'ಸೇರಿಸಿ',
    adding: 'ಸೇರಿಸಲಾಗುತ್ತಿದೆ…',
    vehicleAdded: '{no} ಸೇರಿಸಲಾಗಿದೆ. ಅದರ QR ಕೋಡ್ ಕೆಳಗಿದೆ.',
    vehicleExists: 'ಈ ವಾಹನವನ್ನು ಈಗಾಗಲೇ ಸೇರಿಸಲಾಗಿದೆ.',
    invalidVehicleNo: 'ಅಕ್ಷರ ಮತ್ತು ಅಂಕೆಗಳನ್ನು ಬಳಸಿ ವಾಹನ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ, ಉದಾ. KA 01 AB 1234.',
    noVehicles: 'ಇನ್ನೂ ಯಾವುದೇ ವಾಹನಗಳಿಲ್ಲ.',
    vehiclesList: 'ವಾಹನಗಳು',
    downloadPng: 'PNG ಡೌನ್‌ಲೋಡ್',
    print: 'ಮುದ್ರಿಸಿ',
  },
}

const LangContext = createContext(null)

function savedLang() {
  try {
    return localStorage.getItem('sg_lang') === 'kn' ? 'kn' : 'en'
  } catch {
    return 'en'
  }
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(savedLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('sg_lang', lang)
    } catch {
      /* storage unavailable: language just won't be remembered */
    }
  }, [lang])

  const t = (key, vars) => {
    let text = strings[lang][key] ?? strings.en[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v)
    return text
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
