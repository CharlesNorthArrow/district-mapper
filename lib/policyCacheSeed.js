// Bundled fallback cache for canonical demo keywords.
// Ships with the repo so demos never depend on the live Open States API.
// Populated by scripts/seed-policy-cache.mjs (one-shot, committed).
// Keys are { jurisdiction:session:keyword } — same shape as DB cache.

const SEED = {
  "New York:2025-2026:immigration": [
    {
      "id": "ocd-bill/c8a7ca6f-8145-4899-86c7-495df9111834",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10774",
      "title": "Prohibits the employment of certain immigration and customs enforcement agents or officers in certain state and local positions",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-04-02T01:23:55.428371+00:00",
      "updated_at": "2026-06-18T17:07:03.990770+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10774/",
      "first_action_date": "2026-04-01",
      "latest_action_date": "2026-04-01",
      "latest_action_description": "REFERRED TO GOVERNMENTAL EMPLOYEES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Prohibits certain immigration and customs enforcement agents or officers from holding employment as a state employee, an employee of a political subdivision, a law enforcement officer, or a teacher; defines terms.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/b42a94b3-95d6-4ed4-9828-33db39a799e7",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 7960",
      "title": "Enacts the state airport facilities enforcing accountability in immigration removals (SAFE AIR) act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-05-15T15:39:33.683546+00:00",
      "updated_at": "2026-06-17T04:13:29.838251+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S7960/",
      "first_action_date": "2025-05-15",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO PROCUREMENT AND CONTRACTS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Prohibits public entities from contracting with airlines that transport individuals who have been detained by U.S. immigration and customs enforcement without being afforded due process rights; prohibits certain sales and use tax exemptions on fuel sold to an airline that transports individuals who have been detained by U.S. immigration and customs enforcement without being afforded due process rights.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/fb179b62-5e78-497a-b36b-ce76d91c284b",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 4735",
      "title": "Relates to protecting students, faculty, and staff from immigration enforcement while attending or participating in school activities",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-02-12T16:49:37.131502+00:00",
      "updated_at": "2026-06-17T03:22:54.833909+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S4735/",
      "first_action_date": "2025-02-12",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CODES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Prohibits immigration enforcement in school settings; prohibits all public and charter schools from allowing law enforcement officials inside school property to access a student, except to address an imminent safety situation or if they have an appropriate judicial warrant or judicial order.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/99fdd1a9-4d22-4823-b853-c8533ba1991e",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10464",
      "title": "Relates to Medicaid accountability",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-03-06T20:31:49.265896+00:00",
      "updated_at": "2026-06-16T02:43:21.492210+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10464/",
      "first_action_date": "2026-03-06",
      "latest_action_date": "2026-05-19",
      "latest_action_description": "HELD FOR CONSIDERATION IN HEALTH",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Relates to improving Medicaid accountability; verifies Medicaid enrollment data; audits certain Medicaid program areas; creates managed care payment safeguards; establishes a biometric verification pilot program.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/ad239a33-3314-4d37-beeb-e2c6fbe28a19",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 6635",
      "title": "Establishes the green accessible transition authority and establishes a for-hire vehicle improvement surcharge; appropriation",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-03-07T04:15:58.107857+00:00",
      "updated_at": "2026-06-11T23:09:38.534486+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A6635/",
      "first_action_date": "2025-03-06",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CORPORATIONS, AUTHORITIES AND COMMISSIONS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes the green transition authority to promote the transition of the for-hire vehicle and other state industries to environmentally sustainable practices and increase universal accessibility of for-hire vehicles, paratransit services, and taxi services statewide; establishes a for-hire vehicle improvement surcharge for each for-hire transportation trip conducted in a transportation network company vehicle or by a high-volume for-hire service; makes an appropriation therefor.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/9bcb9553-1f8b-494f-9d9e-6fcdc4369a70",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10000",
      "title": "STATE OPERATIONS BUDGET",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-22T08:57:12.283117+00:00",
      "updated_at": "2026-06-10T20:37:20.955986+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10000/",
      "first_action_date": "2026-01-21",
      "latest_action_date": "2026-06-10",
      "latest_action_description": "TABLED LINE VETO MEMO.1",
      "latest_passage_date": "2026-05-27",
      "abstracts": [
        {
          "abstract": "Makes appropriations for the support of government - State Operations Budget.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/94d88d84-5ef8-4d40-a6c2-f7b3ff5a864b",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 7422",
      "title": "Relates to motions to vacate judgment; repealer",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-03-26T00:03:21.060697+00:00",
      "updated_at": "2026-06-10T05:46:17.236783+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A7422/",
      "first_action_date": "2025-03-25",
      "latest_action_date": "2026-04-22",
      "latest_action_description": "PRINT NUMBER 7422C",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Relates to motions to vacate judgment; authorizes filing motions to vacate judgment for a conviction that was subsequently decriminalized; authorizes motions to vacate judgment to be filed at any time after entry of a judgment obtained at trial or by plea; repeals certain provisions relating thereto.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/62cb660b-cffe-49ce-85b6-4e3106846858",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 675",
      "title": "Relates to enacting the empire state licensing act; repealer",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-06T20:37:35.030566+00:00",
      "updated_at": "2026-06-10T05:29:55.642519+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A675/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-06-03",
      "latest_action_description": "ORDERED TO THIRD READING RULES CAL.442",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the empire state licensing act to provide all New Yorkers with access to professional, occupational, commercial, or business licenses, permits, certificates, or related registrations regardless of an applicant's citizenship or immigration status.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/b1ac35e0-6c0b-4fb0-a80e-d2663ba07b91",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 9003",
      "title": "AID TO LOCALITIES BUDGET",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-22T08:32:34.211095+00:00",
      "updated_at": "2026-06-10T04:53:00.326191+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S9003/",
      "first_action_date": "2026-01-21",
      "latest_action_date": "2026-06-09",
      "latest_action_description": "THRU LINE VETO MEMO.4",
      "latest_passage_date": "2026-05-27",
      "abstracts": [
        {
          "abstract": "Makes appropriations for the support of government - Aid to Localities Budget.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/f724dd8b-b85f-42ff-b84e-a4b9608ecef2",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 492",
      "title": "Relates to domestic violence training for judges, court clerks and law enforcement officers",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-01T19:33:31.975626+00:00",
      "updated_at": "2026-06-10T04:22:58.382878+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S492/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO JUDICIARY",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Requires judges or justices in a court that exercises criminal jurisdiction, including town and village justices, family court judges, and justices of the supreme court who regularly handle matrimonial matters, and court clerks of such courts to attend a program approved by the chief administrator of the courts addressing issues relating to domestic violence totaling at least ten hours every two years; requires law enforcement officers to complete ten hours of domestic violence training every two years.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/bcf869bc-e7f4-43d4-8711-443feaa1c9c0",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "E 1625",
      "title": "Establishes a plan setting forth an itemized list of grantees for a certain appropriation for the 2026-27 state fiscal year for grants in aid for certain services and expenses",
      "classification": [
        "resolution"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-06-05T14:10:26.054666+00:00",
      "updated_at": "2026-06-06T05:20:36.799509+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/E1625/",
      "first_action_date": "2026-06-04",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "ADOPTED",
      "latest_passage_date": "2026-06-05",
      "abstracts": []
    },
    {
      "id": "ocd-bill/e6e5ccc3-3b58-4efc-a4b8-5729101e1c28",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 11537",
      "title": "Enacts the safe access to care act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-06-02T02:56:31.519907+00:00",
      "updated_at": "2026-06-06T05:00:49.315897+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A11537/",
      "first_action_date": "2026-06-01",
      "latest_action_date": "2026-06-01",
      "latest_action_description": "REFERRED TO HEALTH",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the safe access to care act requiring certain healthcare facilities to adopt and make public a statement of patient rights and healthcare facility obligations with regards to immigration enforcement; includes unlawful or non-judicially authorized immigration enforcement actions at a healthcare facility as a workplace threat or hazard for purposes of the violence prevention program.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/48339e25-b1e4-4b12-b16f-7d08ea8b492e",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 6341",
      "title": "Requires the collection of certain demographic information by state agencies, boards, departments and commissions",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-03-04T17:36:46.860520+00:00",
      "updated_at": "2026-06-06T04:14:12.027948+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A6341/",
      "first_action_date": "2025-03-04",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "REPORTED REFERRED TO RULES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Requires the collection of certain demographic information by state agencies, boards, departments and commissions.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/41904def-749d-40fa-b672-1453bae4af81",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 9773",
      "title": "Relates to remedies for unlawful discharge or discrimination for the exercise of an employee's right to be absent from employment for jury duty",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-04-07T00:59:30.329252+00:00",
      "updated_at": "2026-06-06T03:38:12.367200+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S9773/",
      "first_action_date": "2026-04-06",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "REFERRED TO JUDICIARY",
      "latest_passage_date": "2026-06-04",
      "abstracts": [
        {
          "abstract": "Creates, in addition to the existing sanction of criminal contempt of court, the remedies of labor law civil penalties and employee's right to bring civil action for unlawful discharge, penalty or discrimination on account of the exercise by an employee of a juror's right to be absent from employment by reason of jury service.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/723fd76e-b923-41e0-986c-8d17e69c8159",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 11596",
      "title": "Adds libraries to the list of sensitive locations for immigration enforcement purposes",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-06-06T03:23:04.747927+00:00",
      "updated_at": "2026-06-06T03:23:05.074077+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A11596/",
      "first_action_date": "2026-06-05",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "REFERRED TO CODES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Adds libraries to the list of sensitive locations for immigration enforcement purposes.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/ab1a6299-fbab-4976-b26a-8e384b5f74e5",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 10494",
      "title": "Enacts the safe access to care act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-05-16T06:02:46.876939+00:00",
      "updated_at": "2026-06-06T03:00:43.086376+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S10494/",
      "first_action_date": "2026-05-15",
      "latest_action_date": "2026-05-15",
      "latest_action_description": "REFERRED TO HEALTH",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the safe access to care act requiring certain healthcare facilities to adopt and make public a statement of patient rights and healthcare facility obligations with regards to immigration enforcement; includes unlawful or non-judicially authorized immigration enforcement actions at a healthcare facility as a workplace threat or hazard for purposes of the violence prevention program.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/602e6b7f-e9d8-480b-bf84-2a6c3b7b498f",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 10593",
      "title": "Relates to certain powers of the attorney general",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-05-29T00:57:33.589843+00:00",
      "updated_at": "2026-06-06T02:42:18.558473+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S10593/",
      "first_action_date": "2026-05-28",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "REFERRED TO WAYS AND MEANS",
      "latest_passage_date": "2026-06-04",
      "abstracts": [
        {
          "abstract": "Authorizes the denial of access to certain public records which relate to civil investigations; relates to the enforcement powers of the attorney general; authorizes the attorney general to investigate and bring any civil action addressing repeated or persistent discrimination in elementary and secondary schools; requires the compromise of any claim which the state may have for care, maintenance or treatment furnished in hospitals or other such facilities to be made accordance with parameters established by the office of the attorney general; allows the commissioner of health to waive bills or compromise bills for the maintenance, care and treatment furnished to patients in medical facilities upon the prior approval of the comptroller alone.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/fcce6a6f-8320-47a2-b933-a058daa5d1c9",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 3909",
      "title": "Enacts the \"New York state phoenix act\"",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-30T22:12:11.671716+00:00",
      "updated_at": "2026-06-05T16:39:35.254790+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S3909/",
      "first_action_date": "2025-01-30",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "COMMITTED TO RULES",
      "latest_passage_date": "2025-05-21",
      "abstracts": [
        {
          "abstract": "Enacts the \"New York State Phoenix Act\"; extends the statute of limitations for felony family offenses to ten years and misdemeanor family offenses to five years.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/b94f79f4-979d-4ea7-843c-7e31ab2030f1",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 9275",
      "title": "Requires Medicaid to cover gender-affirming care regardless of federal funding; prohibits discriminatory practices by health care entities and insurers; relates to coverage for treatment for gender dysphoria",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-02-24T02:00:11.952247+00:00",
      "updated_at": "2026-06-05T16:24:10.312162+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S9275/",
      "first_action_date": "2026-02-23",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "COMMITTED TO RULES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Requires Medicaid to cover gender-affirming care regardless of federal funding; prohibits discriminatory practices by health care entities including hospitals, certain professionals, and insurers; requires insurance coverage for services or treatments for gender dysphoria or gender incongruence.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/f3f1e318-c57a-454c-8cad-c3acfcd3dc53",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 1086",
      "title": "Relates to enacting the empire state licensing act; repealer",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-08T14:44:58.013764+00:00",
      "updated_at": "2026-06-05T15:55:13.252571+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S1086/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "RECOMMITTED TO RULES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the empire state licensing act to provide all New Yorkers with access to professional, occupational, commercial, or business licenses, permits, certificates, or related registrations regardless of an applicant's citizenship or immigration status.",
          "note": ""
        }
      ]
    }
  ],
  "New York:2025-2026:legal aid": [
    {
      "id": "ocd-bill/14dc0045-74a8-4684-a251-d18663fedad1",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 8646",
      "title": "Relates to the New York election officer protection act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-08T00:50:23.208934+00:00",
      "updated_at": "2026-06-17T05:46:58.497599+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S8646/",
      "first_action_date": "2026-01-07",
      "latest_action_date": "2026-01-12",
      "latest_action_description": "REFERRED TO ELECTION LAW",
      "latest_passage_date": "2026-01-12",
      "abstracts": [
        {
          "abstract": "Prohibits the intimidation, obstruction, or the unlawful dissemination of personal information of election officers; makes election officers eligible for the address confidentiality program.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/992fda16-3f48-4603-9c46-b4925822634e",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 8713",
      "title": "Relates to certain crimes of interference with health care services or religious worship",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-08T00:08:37.794845+00:00",
      "updated_at": "2026-06-17T04:11:41.177010+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S8713/",
      "first_action_date": "2026-01-07",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CODES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Relates to the definition of \"reproductive health services\" for purposes of the offense of criminal interference with health care services or religious worship in the second degree; defines \"legally protected health activity\"; increases the penalties for the criminal interference with health care services or religious worship in the first and second degrees, and for aggravated interference with health care services in the second degree.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/ad239a33-3314-4d37-beeb-e2c6fbe28a19",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 6635",
      "title": "Establishes the green accessible transition authority and establishes a for-hire vehicle improvement surcharge; appropriation",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-03-07T04:15:58.107857+00:00",
      "updated_at": "2026-06-11T23:09:38.534486+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A6635/",
      "first_action_date": "2025-03-06",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CORPORATIONS, AUTHORITIES AND COMMISSIONS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes the green transition authority to promote the transition of the for-hire vehicle and other state industries to environmentally sustainable practices and increase universal accessibility of for-hire vehicles, paratransit services, and taxi services statewide; establishes a for-hire vehicle improvement surcharge for each for-hire transportation trip conducted in a transportation network company vehicle or by a high-volume for-hire service; makes an appropriation therefor.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/346125af-5d3d-4ab4-9e3a-549abf983816",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10004",
      "title": "CAPITAL PROJECTS BUDGET",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-22T08:29:09.139413+00:00",
      "updated_at": "2026-06-10T22:47:30.975035+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10004/",
      "first_action_date": "2026-01-21",
      "latest_action_date": "2026-06-10",
      "latest_action_description": "THRU LINE VETO MEMO.6",
      "latest_passage_date": "2026-05-27",
      "abstracts": [
        {
          "abstract": "Makes appropriations for the support of government - Capital Projects Budget.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/9bcb9553-1f8b-494f-9d9e-6fcdc4369a70",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10000",
      "title": "STATE OPERATIONS BUDGET",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-22T08:57:12.283117+00:00",
      "updated_at": "2026-06-10T20:37:20.955986+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10000/",
      "first_action_date": "2026-01-21",
      "latest_action_date": "2026-06-10",
      "latest_action_description": "TABLED LINE VETO MEMO.1",
      "latest_passage_date": "2026-05-27",
      "abstracts": [
        {
          "abstract": "Makes appropriations for the support of government - State Operations Budget.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/2d5eaeee-2f87-4937-994b-d395fa8a5638",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10001",
      "title": "LEGISLATURE AND JUDICIARY BUDGET",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-22T07:20:33.645683+00:00",
      "updated_at": "2026-06-10T05:02:35.669808+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10001/",
      "first_action_date": "2026-01-21",
      "latest_action_date": "2026-06-09",
      "latest_action_description": "SIGNED CHAP.51",
      "latest_passage_date": "2026-05-27",
      "abstracts": [
        {
          "abstract": "Makes appropriations for the support of government - Legislature and Judiciary Budget.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/b1ac35e0-6c0b-4fb0-a80e-d2663ba07b91",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 9003",
      "title": "AID TO LOCALITIES BUDGET",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-22T08:32:34.211095+00:00",
      "updated_at": "2026-06-10T04:53:00.326191+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S9003/",
      "first_action_date": "2026-01-21",
      "latest_action_date": "2026-06-09",
      "latest_action_description": "THRU LINE VETO MEMO.4",
      "latest_passage_date": "2026-05-27",
      "abstracts": [
        {
          "abstract": "Makes appropriations for the support of government - Aid to Localities Budget.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/eb18bd16-4cdb-440f-aba8-cfe793fc89f0",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 1494",
      "title": "Repeals the rebates for stock transfer tax paid; dedicates funds of the stock transfer tax fund and stock transfer incentive fund to various funds",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-10T19:24:43.625688+00:00",
      "updated_at": "2026-06-10T04:18:30.986139+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A1494/",
      "first_action_date": "2025-01-10",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO WAYS AND MEANS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Repeals the rebates for stock transfer tax paid; dedicates funds of the stock transfer tax fund and stock transfer incentive fund to various funds; establishes the safe water and infrastructure action program.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/bcf869bc-e7f4-43d4-8711-443feaa1c9c0",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "E 1625",
      "title": "Establishes a plan setting forth an itemized list of grantees for a certain appropriation for the 2026-27 state fiscal year for grants in aid for certain services and expenses",
      "classification": [
        "resolution"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-06-05T14:10:26.054666+00:00",
      "updated_at": "2026-06-06T05:20:36.799509+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/E1625/",
      "first_action_date": "2026-06-04",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "ADOPTED",
      "latest_passage_date": "2026-06-05",
      "abstracts": []
    },
    {
      "id": "ocd-bill/636e61d5-d280-4659-9aec-e2780d68c4b6",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 8807",
      "title": "Relates to procedures for protections of legally protected health activities",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-09T05:46:20.825794+00:00",
      "updated_at": "2026-06-06T05:04:50.377343+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S8807/",
      "first_action_date": "2026-01-08",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "SIGNED CHAP.128",
      "latest_passage_date": "2026-03-31",
      "abstracts": [
        {
          "abstract": "Specifies that professional liability insurance insurers cannot deny coverage or increase rates solely based on legal use or prescription of certain gender-affirming care-related drugs; prescribes procedures for warrants issued in other jurisdictions for electronic data related to legally protected health activities; provides for additional procedural methods for protection of legally protected health activities.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/8497eacd-8e62-4bc3-a5a6-70c17789bb67",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 4462",
      "title": "Authorizes Medicaid coverage for the complex care assistant program",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-02-05T22:38:47.640771+00:00",
      "updated_at": "2026-06-06T04:06:37.594984+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S4462/",
      "first_action_date": "2025-02-05",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "REFERRED TO HEALTH",
      "latest_passage_date": "2026-06-04",
      "abstracts": [
        {
          "abstract": "Establishes a program for specific individuals to become complex care assistants and provide private duty nursing services to certain Medicaid enrollees.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/73d57a58-c097-495b-939f-869e1bbad7e6",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10899",
      "title": "Relates to crypto kiosks",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-04-08T20:00:36.379496+00:00",
      "updated_at": "2026-06-06T02:41:28.867405+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10899/",
      "first_action_date": "2026-04-08",
      "latest_action_date": "2026-05-29",
      "latest_action_description": "AMEND AND RECOMMIT TO RULES 10899C",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Provides for the registration and regulation of crypto kiosks and exchanges and licensing of cashier crypto exchange operators.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/ed0b822e-4706-4d64-b004-abe914962158",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 3394",
      "title": "Enacts the ceasing repeated and extremely egregious predatory (CREEP) behavior act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-27T19:54:22.137856+00:00",
      "updated_at": "2026-06-05T16:54:55.719076+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S3394/",
      "first_action_date": "2025-01-27",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "RETURNED TO SENATE",
      "latest_passage_date": "2026-06-04",
      "abstracts": [
        {
          "abstract": "Enacts the \"ceasing repeated and extremely egregious predatory (CREEP) behavior act\"; provides for the issuance of anti-stalking orders.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/05ef1dcd-e2e5-4852-aff5-6649ff74e99f",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "R 2359",
      "title": "Establishes a plan setting forth an itemized list of grantees for 2026-2027 providing Public Health and Mental Health programs and services",
      "classification": [
        "resolution"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-06-05T16:49:54.282253+00:00",
      "updated_at": "2026-06-05T16:49:54.525657+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/R2359/",
      "first_action_date": "2026-06-04",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "ADOPTED",
      "latest_passage_date": "2026-06-04",
      "abstracts": []
    },
    {
      "id": "ocd-bill/670edc06-749c-4ed3-b61f-a68b9e929a89",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 9891",
      "title": "Relates to crypto kiosks",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-04-14T00:26:17.791374+00:00",
      "updated_at": "2026-06-05T16:34:11.690121+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S9891/",
      "first_action_date": "2026-04-13",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "REFERRED TO CODES",
      "latest_passage_date": "2026-06-03",
      "abstracts": [
        {
          "abstract": "Provides for the registration and regulation of crypto kiosks and exchanges and licensing of cashier crypto exchange operators.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/09b98085-5cdd-47ae-b1b7-73f4089f660a",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 3226",
      "title": "Enacts the ceasing repeated and extremely egregious predatory (CREEP) behavior act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-24T21:51:07.933264+00:00",
      "updated_at": "2026-06-05T15:46:30.465676+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A3226/",
      "first_action_date": "2025-01-24",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "SUBSTITUTED BY S3394A",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the \"ceasing repeated and extremely egregious predatory (CREEP) behavior act\"; provides for the issuance of anti-stalking orders.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/4a7fe537-4aff-4e31-9d5e-b1fb5f6faf28",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 9088",
      "title": "Requires the registration of data brokers and establishing a data deletion mechanism for consumers",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-31T03:08:50.561981+00:00",
      "updated_at": "2026-06-05T15:31:11.590983+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S9088/",
      "first_action_date": "2026-01-30",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "REFERRED TO CONSUMER AFFAIRS AND PROTECTION",
      "latest_passage_date": "2026-06-03",
      "abstracts": [
        {
          "abstract": "Requires the registration of data brokers; imposes regulations upon data brokers; establishes a data deletion mechanism for consumers; imposes penalties upon data brokers for violations of the law.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/ee29b52b-9d04-4768-bf8d-094c6473958a",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "R 2358",
      "title": "Establishes a plan setting forth an itemized list of grantees for 2026-2027 providing Public Protection and Economic Development programs and services",
      "classification": [
        "resolution"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-06-05T14:46:38.744524+00:00",
      "updated_at": "2026-06-05T14:46:39.018334+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/R2358/",
      "first_action_date": "2026-06-04",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "ADOPTED",
      "latest_passage_date": "2026-06-04",
      "abstracts": []
    },
    {
      "id": "ocd-bill/4aecb655-c6bc-44df-a76b-4fd73e29b35e",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "R 2349",
      "title": "Amends a plan establishing itemized list of grantees for 2025-2026 providing community safety and restorative justice programs",
      "classification": [
        "resolution"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-06-05T14:36:48.041840+00:00",
      "updated_at": "2026-06-05T14:36:48.305935+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/R2349/",
      "first_action_date": "2026-06-04",
      "latest_action_date": "2026-06-04",
      "latest_action_description": "ADOPTED",
      "latest_passage_date": "2026-06-04",
      "abstracts": []
    },
    {
      "id": "ocd-bill/e0a2d951-a2d8-45b9-9b53-faefbe19664c",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 8883",
      "title": "Enacts the \"New York state vehicle security circumvention device act\"",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-14T12:19:23.167507+00:00",
      "updated_at": "2026-06-05T14:30:32.225398+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S8883/",
      "first_action_date": "2026-01-13",
      "latest_action_date": "2026-06-05",
      "latest_action_description": "COMMITTED TO RULES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the \"New York state vehicle security circumvention device act\" to prohibit the manufacturing, sale, offering to sell, or possession of devices outside of lawful and reasonable purposes.",
          "note": ""
        }
      ]
    }
  ],
  "New York:2025-2026:deportation": [
    {
      "id": "ocd-bill/c8a7ca6f-8145-4899-86c7-495df9111834",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10774",
      "title": "Prohibits the employment of certain immigration and customs enforcement agents or officers in certain state and local positions",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-04-02T01:23:55.428371+00:00",
      "updated_at": "2026-06-18T17:07:03.990770+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10774/",
      "first_action_date": "2026-04-01",
      "latest_action_date": "2026-04-01",
      "latest_action_description": "REFERRED TO GOVERNMENTAL EMPLOYEES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Prohibits certain immigration and customs enforcement agents or officers from holding employment as a state employee, an employee of a political subdivision, a law enforcement officer, or a teacher; defines terms.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/b42a94b3-95d6-4ed4-9828-33db39a799e7",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 7960",
      "title": "Enacts the state airport facilities enforcing accountability in immigration removals (SAFE AIR) act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-05-15T15:39:33.683546+00:00",
      "updated_at": "2026-06-17T04:13:29.838251+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S7960/",
      "first_action_date": "2025-05-15",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO PROCUREMENT AND CONTRACTS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Prohibits public entities from contracting with airlines that transport individuals who have been detained by U.S. immigration and customs enforcement without being afforded due process rights; prohibits certain sales and use tax exemptions on fuel sold to an airline that transports individuals who have been detained by U.S. immigration and customs enforcement without being afforded due process rights.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/ecd7cf23-017a-4a81-8aad-35426490a9c1",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 88",
      "title": "Provides for automatic voter registration and preregistration for persons applying for certain department of motor vehicles documentation, and for Medicaid enrollees",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-01T19:23:55.986309+00:00",
      "updated_at": "2026-06-05T16:08:48.964840+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S88/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-05-11",
      "latest_action_description": "REFERRED TO ELECTION LAW",
      "latest_passage_date": "2026-05-11",
      "abstracts": [
        {
          "abstract": "Provides for automatic voter registration and pre-registration for persons applying for certain department of motor vehicles documentation, and for persons applying for or re-enrolling in Medicaid; allows individuals to decline such automatic registration and pre-registration.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/fa30e366-10da-4cc1-b78e-40d0c977dc96",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 9206",
      "title": "Establishes the community disaster relief and recovery act of 2025",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-11-03T23:58:36.945254+00:00",
      "updated_at": "2026-06-04T02:47:11.899546+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A9206/",
      "first_action_date": "2025-11-03",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO GOVERNMENTAL OPERATIONS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes the community disaster relief and recovery act which will create an emergency assistance program for undocumented individuals impacted by a natural disaster.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/d0d75447-34a7-4f1b-be8b-68b5fe8d524b",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 403",
      "title": "Establishes application processing and review requirements for reprieves, commutations and pardons",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-02T18:33:21.420717+00:00",
      "updated_at": "2026-06-02T14:06:23.318094+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A403/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO GOVERNMENTAL OPERATIONS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes application processing and review requirements for reprieves, commutations and pardons by the governor; requires the governor to provide: a written notification that the application has been received; a receipt number that the applicant can then use to check on the applicant's application status; guidelines for supplementing the application with additional or updated information; and a notification when a decision is made on the application; requires quarterly reports to the legislature regarding reprieves, commutations and pardons.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/72a4e49c-58f5-471e-8662-6917f99dacd2",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 6772",
      "title": "Provides for automatic voter registration and preregistration for persons applying for certain department of motor vehicles documentation, and for Medicaid enrollees",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-03-14T23:46:37.065060+00:00",
      "updated_at": "2026-05-23T14:35:24.908041+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A6772/",
      "first_action_date": "2025-03-13",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO ELECTION LAW",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Provides for automatic voter registration and pre-registration for persons applying for certain department of motor vehicles documentation, and for persons applying for or re-enrolling in Medicaid; allows individuals to decline such automatic registration and pre-registration.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/4042419a-1b32-4a2d-9081-4e536b30bf8f",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "K 1408",
      "title": "Memorializing Governor Kathy Hochul to proclaim May 20, 2026, as Armenian Heritage Day in the State of New York",
      "classification": [
        "resolution"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-05-20T03:16:55.284726+00:00",
      "updated_at": "2026-05-21T04:21:34.639837+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/K1408/",
      "first_action_date": "2026-05-19",
      "latest_action_date": "2026-05-20",
      "latest_action_description": "ADOPTED",
      "latest_passage_date": "2026-05-20",
      "abstracts": []
    },
    {
      "id": "ocd-bill/70ca9e5f-71ec-4eb4-a3ce-2f45ac3c7c80",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 159",
      "title": "Relates to findings of the state board of parole necessary for discretionary release of incarcerated individuals on parole",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-01T19:23:11.973252+00:00",
      "updated_at": "2026-05-21T02:37:30.721413+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S159/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-05-20",
      "latest_action_description": "REPORTED AND COMMITTED TO FINANCE",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Provides for findings of the state board of parole necessary for discretionary release of incarcerated individuals on parole.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/007f118c-3445-40f1-b6cc-c5c8aada7064",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 2689",
      "title": "Enacts the building up immigrant legal defense or BUILD act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-22T15:38:30.193823+00:00",
      "updated_at": "2026-05-15T06:34:48.671107+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A2689/",
      "first_action_date": "2025-01-22",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO GOVERNMENTAL OPERATIONS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the building up immigrant legal defense or BUILD act to provide competitive workforce development and capacity building grants to eligible entities that are seeking to expand access to representation for individuals facing deportation by increasing the workforce and strengthening the legal services infrastructure needed to provide such representation.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/04e40e09-d992-4b0c-bb62-cff1c34c2249",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 8854",
      "title": "Grants the family court jurisdiction to determine guardianship of minors and infants when there are extraordinary circumstances, including parental deportation",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-10T01:21:52.288278+00:00",
      "updated_at": "2026-05-12T19:42:45.580913+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S8854/",
      "first_action_date": "2026-01-09",
      "latest_action_date": "2026-05-01",
      "latest_action_description": "PRINT NUMBER 8854A",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Grants the family court jurisdiction to determine guardianship of minors and infants when there are extraordinary circumstances, including deportation, removal, or forced departure of a parent from the United States; requires the office of court administration to revise certain orders or forms used by the family court to comply with such provisions; provides that the court may, but need not, find abuse, neglect, or abandonment where extraordinary circumstances are found to exist.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/92e4bdac-2945-4051-b1f7-656c752632ff",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 606",
      "title": "Establishes the \"Not on our dime!: Ending New York funding of Israeli settler violence act\" to prohibit not-for-profit corporations from engaging in unauthorized support of Israeli settlement activity",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-03T00:21:21.365997+00:00",
      "updated_at": "2026-05-09T12:44:53.746318+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S606/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CORPORATIONS, AUTHORITIES AND COMMISSIONS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes the \"Not on our dime!: Ending New York funding of Israeli settler violence act\" to prohibit not-for-profit corporations from engaging in unauthorized support of Israeli settlement activity; allows for recovery of a civil penalty by the state attorney general; creates a private right of action for violations.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/4b13021f-2828-4c4e-b1c8-fa3d5c3a1ec6",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 11289",
      "title": "Establishes the \"Not on our dime!: Ending New York funding of Israeli settler violence act\" to prohibit not-for-profit corporations from engaging in unauthorized support of Israeli settlement activity",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-05-09T01:08:56.204215+00:00",
      "updated_at": "2026-05-09T01:08:56.606240+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A11289/",
      "first_action_date": "2026-05-08",
      "latest_action_date": "2026-05-08",
      "latest_action_description": "REFERRED TO CORPORATIONS, AUTHORITIES AND COMMISSIONS",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes the \"Not on our dime!: Ending New York funding of Israeli settler violence act\" to prohibit not-for-profit corporations from engaging in unauthorized support of Israeli settlement activity; allows for recovery of a civil penalty by the state attorney general; creates a private right of action for violations.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/3e4f0ce1-acac-4ea8-ba62-8f1d4546f64f",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 394",
      "title": "Establishes application processing and review requirements for reprieves, commutations and pardons",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-01T19:28:53.944407+00:00",
      "updated_at": "2026-05-06T05:30:20.737690+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S394/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-05-05",
      "latest_action_description": "REPORTED AND COMMITTED TO FINANCE",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes application processing and review requirements for reprieves, commutations and pardons by the governor; requires the governor to provide: a written notification that the application has been received; a receipt number that the applicant can then use to check on the applicant's application status; guidelines for supplementing the application with additional or updated information; and a notification when a decision is made on the application; requires quarterly reports to the legislature regarding reprieves, commutations and pardons.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/cd7aff9d-85c6-4655-9716-bc4d7f2a0539",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 270",
      "title": "Establishes the right to legal counsel in immigration court proceedings and provides for the administration thereof",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-01T19:30:03.900230+00:00",
      "updated_at": "2026-05-02T00:22:37.792557+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A270/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CODES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes the right to legal counsel in immigration court proceedings; provides for the administration thereof.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/c144a041-2e23-499c-8df4-0d8330a51f20",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 10098",
      "title": "Grants the family court jurisdiction to determine guardianship of minors and infants when there are extraordinary circumstances, including parental deportation",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-01-31T03:03:28.264174+00:00",
      "updated_at": "2026-05-01T22:46:25.637690+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A10098/",
      "first_action_date": "2026-01-30",
      "latest_action_date": "2026-01-30",
      "latest_action_description": "REFERRED TO CHILDREN AND FAMILIES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Grants the family court jurisdiction to determine guardianship of minors and infants when there are extraordinary circumstances, including deportation, removal, or forced departure of a parent from the United States; requires the office of court administration to revise certain orders or forms used by the family court to comply with such provisions; provides that the court may, but need not, find abuse, neglect, or abandonment where extraordinary circumstances are found to exist.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/5da9ede3-359e-4fbd-98aa-036ea28f8dff",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "K 1200",
      "title": "Memorializing Governor Kathy Hochul to proclaim April 27, 2026, as Children of the Holocaust Remembrance Day in the State of New York",
      "classification": [
        "resolution"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-04-24T17:40:04.383777+00:00",
      "updated_at": "2026-04-28T16:16:03.836551+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/K1200/",
      "first_action_date": "2026-04-24",
      "latest_action_date": "2026-04-27",
      "latest_action_description": "ADOPTED",
      "latest_passage_date": "2026-04-27",
      "abstracts": []
    },
    {
      "id": "ocd-bill/019e8ae0-aadc-4a3c-b241-2e0534ee5f43",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 4538",
      "title": "Enacts the building up immigrant legal defense or BUILD act",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-02-06T22:46:13.066194+00:00",
      "updated_at": "2026-04-18T07:22:14.174221+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S4538/",
      "first_action_date": "2025-02-06",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO FINANCE",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the building up immigrant legal defense or BUILD act to provide competitive workforce development and capacity building grants to eligible entities that are seeking to expand access to representation for individuals facing deportation by increasing the workforce and strengthening the legal services infrastructure needed to provide such representation.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/45c3029d-5891-45c6-be81-b1284fc0b6a5",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 9756",
      "title": "Establishes the right to legal counsel in immigration court proceedings and provides for the administration thereof",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2026-04-03T00:09:30.281948+00:00",
      "updated_at": "2026-04-17T21:53:59.376643+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S9756/",
      "first_action_date": "2026-04-02",
      "latest_action_date": "2026-04-02",
      "latest_action_description": "REFERRED TO FINANCE",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Establishes the right to legal counsel in immigration court proceedings; provides for the administration thereof.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/053ee185-84a6-4a36-b946-bd4fbd0b8be7",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/26bb6306-85f0-4d10-bff7-d1cd5bdc0865",
        "name": "Assembly",
        "classification": "lower"
      },
      "identifier": "A 127",
      "title": "Relates to findings of the state board of parole necessary for discretionary release of incarcerated individuals on parole",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-01-01T19:23:58.264779+00:00",
      "updated_at": "2026-03-31T07:12:44.788954+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/A127/",
      "first_action_date": "2025-01-08",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CODES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Provides for findings of the state board of parole necessary for discretionary release of incarcerated individuals on parole.",
          "note": ""
        }
      ]
    },
    {
      "id": "ocd-bill/3fa061a0-815e-462f-8013-707cdf6bd8d4",
      "session": "2025-2026",
      "jurisdiction": {
        "id": "ocd-jurisdiction/country:us/state:ny/government",
        "name": "New York",
        "classification": "state"
      },
      "from_organization": {
        "id": "ocd-organization/8291a233-623d-40e8-882d-21ec2d382c87",
        "name": "Senate",
        "classification": "upper"
      },
      "identifier": "S 4521",
      "title": "Enacts the \"criminal forfeiture process act\"; repealer",
      "classification": [
        "bill"
      ],
      "subject": [],
      "extras": {},
      "created_at": "2025-02-06T18:42:53.653482+00:00",
      "updated_at": "2026-03-18T11:22:18.010472+00:00",
      "openstates_url": "https://openstates.org/ny/bills/2025-2026/S4521/",
      "first_action_date": "2025-02-06",
      "latest_action_date": "2026-01-07",
      "latest_action_description": "REFERRED TO CODES",
      "latest_passage_date": "",
      "abstracts": [
        {
          "abstract": "Enacts the \"criminal forfeiture process act\" to replace the process for the criminal forfeiture of certain property in certain instances.",
          "note": ""
        }
      ]
    }
  ]
};

export function lookupSeed(cacheKey) {
  return SEED[cacheKey] || null;
}

export default SEED;
