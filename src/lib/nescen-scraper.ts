import fs from 'fs';

// Default NESCEN credentials from user
const NESCEN_USER = process.env.NESCEN_USER || "685409";
const NESCEN_PASS = process.env.NESCEN_PASS || "Adv@02573";
const NESCEN_BRANCH = process.env.NESCEN_BRANCH || "55000067";

interface NescenSession {
  cookies: string;
  branch: string;
}

/**
 * Automates logging in to the Advice NESCEN portal and returns the session cookies
 */
export async function loginToNescen(): Promise<NescenSession> {
  const user = NESCEN_USER;
  const pass = NESCEN_PASS;
  const branch = NESCEN_BRANCH;

  let cookies: string[] = [];

  function updateCookies(headers: Headers) {
    const setCookie = headers.get('set-cookie');
    if (setCookie) {
      const parts = setCookie.split(',');
      parts.forEach(part => {
        const cookie = part.split(';')[0].trim();
        if (cookie) {
          const key = cookie.split('=')[0];
          // Filter out duplicate or expired keys
          cookies = cookies.filter(c => !c.startsWith(key + '='));
          cookies.push(cookie);
        }
      });
    }
  }

  function getCookieHeader() {
    return cookies.join('; ');
  }

  // 1. check_user_branch
  const res1 = await fetch('https://branch.nescen.in.th/index.php/shop/login/check_user_branch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: `user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`
  });
  updateCookies(res1.headers);
  const json1 = await res1.json();
  if (json1.status !== 'success') {
    throw new Error(`check_user_branch failed: ${JSON.stringify(json1)}`);
  }

  // 2. authen
  const res2 = await fetch('https://branch.nescen.in.th/index.php/shop/login/authen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': getCookieHeader(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: `user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&shop_cuscode=mobile&machine=`
  });
  updateCookies(res2.headers);
  const json2 = await res2.json();
  if (json2.status !== 'success') {
    throw new Error(`authen failed: ${JSON.stringify(json2)}`);
  }

  // Extract details for session
  const dataIso = json2.data;
  const dataPerson = { ...dataIso };
  dataPerson.shop_cuscode = branch;
  dataPerson.computername = ""; // Resolve the PHP warning message message
  
  if (dataPerson.iso_person_dtl && Array.isArray(dataPerson.iso_person_dtl)) {
    const idx = dataPerson.iso_person_dtl.findIndex((d: any) => d.shop_cuscode8 === branch);
    if (idx !== -1) {
      dataPerson.iso_person_dtl = { ...dataPerson.iso_person_dtl[idx] };
    }
  }

  // Helper to serialize deep objects to x-www-form-urlencoded
  function serializeObject(prefix: string, obj: any): string {
    let str: string[] = [];
    for (let p in obj) {
      if (obj.hasOwnProperty(p)) {
        let k = prefix ? prefix + "[" + p + "]" : p,
          v = obj[p];
        str.push((v !== null && typeof v === "object") ?
          serializeObject(k, v) :
          encodeURIComponent(k) + "=" + encodeURIComponent(v));
      }
    }
    return str.join("&");
  }

  // 3. set_session
  const setSessionBody = serializeObject("", { result: dataPerson });
  const res3 = await fetch('https://branch.nescen.in.th/index.php/shop/login/set_session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': getCookieHeader(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: setSessionBody
  });
  updateCookies(res3.headers);
  await res3.text(); // Consume response text (PHP Warning might be in here, but session is set)

  return {
    cookies: getCookieHeader(),
    branch
  };
}

/**
 * Utility to parse JSON response and strip out PHP warnings/notices
 */
function parseCleanJson<T>(text: string): T {
  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');
  let index = -1;

  if (startObj !== -1 && startArr !== -1) {
    index = Math.min(startObj, startArr);
  } else {
    index = startObj !== -1 ? startObj : startArr;
  }

  if (index === -1) {
    throw new Error("Failed to find valid JSON in NESCEN response");
  }

  const cleanText = text.slice(index);
  return JSON.parse(cleanText) as T;
}

/**
 * Fetches the list of repair tickets for a given date range (format: DD/MM/YYYY)
 */
export async function fetchRepairTickets(
  session: NescenSession,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const queryUrl = `https://branch.nescen.in.th/${session.branch}/index.php/shop/branch_service_backend_two/admin_dashbord`;
  
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': session.cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: `action=search&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  });

  const text = await res.text();
  return parseCleanJson<any[]>(text);
}

/**
 * Fetches detailed ticket history and product info for a specific ticket
 */
export async function fetchTicketHistory(
  session: NescenSession,
  workDtlId: string,
  machineNo: string,
  cus8: string,
  cusname: string
): Promise<any> {
  const queryUrl = `https://branch.nescen.in.th/${session.branch}/index.php/shop/branch_service/getHistory`;

  function serializeObject(prefix: string, obj: any): string {
    let str: string[] = [];
    for (let p in obj) {
      if (obj.hasOwnProperty(p)) {
        let k = prefix ? prefix + "[" + p + "]" : p,
          v = obj[p];
        str.push((v !== null && typeof v === "object") ?
          serializeObject(k, v) :
          encodeURIComponent(k) + "=" + encodeURIComponent(v));
      }
    }
    return str.join("&");
  }

  const postBodyObj = {
    obj_job: {
      work_dtl_id: workDtlId,
      machine_no: machineNo,
      job_id: workDtlId,
      cus8: cus8,
      cusname: cusname
    }
  };
  const postBody = serializeObject("", postBodyObj);

  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': session.cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: postBody
  });

  const text = await res.text();
  return parseCleanJson<any>(text);
}
