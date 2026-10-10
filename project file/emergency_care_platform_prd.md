**PRODUCT REQUIREMENTS  
DOCUMENT**

Emergency Care  
While Help Is on the Way

A coordinated emergency-response platform connecting the public, medical
guidance, responders, ambulances, and hospitals.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>PRODUCT PROMISE<br />
</strong>Help should not begin only when the ambulance arrives. The
platform should help people take safer, informed next steps from the
moment an emergency is reported.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Document status** | Initial working draft                                                                                                             |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **Version**         | 0.1                                                                                                                               |
| **Product stage**   | Concept definition / MVP planning                                                                                                 |
| **Initial context** | Designed with connectivity, service availability, and emergency coordination challenges in mind; launch geography to be confirmed |

# 1. Executive summary

The Emergency Care While Help Is on the Way platform is intended to
close the gap between the moment an emergency is reported and the moment
professional care reaches the patient. It supports the person at the
scene with immediate, easy-to-follow safety guidance while helping
coordinate emergency services, partner ambulances, trained nearby
responders, and a suitable receiving hospital.

The platform does not replace emergency services, clinicians,
ambulances, or hospitals. It helps people reach them, provides carefully
governed interim guidance, and makes the status of the response clearer
to those who need to know.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>CORE EXPERIENCE<br />
</strong>Report an emergency → identify the situation quickly → provide
immediate safety guidance → connect to professional help → coordinate
responders and destination hospital → keep authorised contacts informed
→ hand over to professional care.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Problem statement

During a serious emergency, bystanders may not know what to do,
emergency services may be difficult to reach, responders may struggle to
locate the scene, and hospitals may not be prepared for the patient's
arrival. People can lose valuable time waiting without clear guidance or
reliable information about what is happening.

## Opportunity

- Give ordinary people a clear, low-friction way to report an emergency.

- Offer safe, situation-appropriate instructions while professional help
  is being arranged.

- Improve coordination and visibility across the person at the scene,
  emergency services, responders, and receiving hospital.

- Provide truthful status updates so users do not mistake a request for
  confirmed dispatch or hospital acceptance.

# 3. Product vision and goals

Vision: make the period before professional help arrives safer, more
coordinated, and less confusing.

## Goals

- Help anyone report an emergency, whether they are the patient, a
  bystander, a family member, or a responder.

- Reduce avoidable delays caused by confusion, missing location details,
  or unclear next steps.

- Provide immediate, safe guidance without requiring a live professional
  connection first.

- Support contact with established emergency services and coordinate
  participating ambulances and responders where available.

- Help identify a suitable receiving hospital and share relevant
  information with authorised care teams.

- Keep selected trusted contacts informed without exposing sensitive
  details publicly.

- Remain useful when internet connectivity is weak or some services are
  unavailable.

# 4. Non-goals and boundaries

- The platform is not a replacement for emergency numbers, ambulance
  services, clinicians, or hospitals.

- The platform will not promise that an ambulance, responder, clinician,
  or hospital is available until that status is confirmed.

- The platform will not allow unverified members of the public to access
  sensitive incident details or act as medical professionals.

- The platform will not independently make high-risk clinical decisions
  or provide instructions that substitute for professional assessment.

- The platform will not assume that the nearest hospital is the most
  appropriate hospital.

- The platform will not publicly broadcast a patient's identity, medical
  details, or precise location by default.

# 5. Target users and user groups

Users are organised into four groups to simplify access control, verification, and information sharing. Hospitals are an admin type within the Administration group, not a separate public role.

## Group A — Public & community (low-friction access, no pre-verification)

| **Role**                            | **Purpose**                                                                                 |
|-------------------------------------|---------------------------------------------------------------------------------------------|
| **Patient**                         | Requests help for themselves when able to do so.                                            |
| **Bystander / helper**              | Reports an emergency and follows guidance while supporting the patient.                     |
| **Family member / trusted contact** | Receives approved progress updates and relevant coordination information.                   |

Access: can report incidents, view own incident guidance and status, select trusted contacts. Cannot view other incidents or sensitive responder/hospital details.

## Group B — Response network (verified field responders)

| **Role**                       | **Purpose**                                                                                                       |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------|
| **Trained nearby responder**   | A verified first-aider, healthcare professional, or appropriately trained volunteer who may assist when suitable. |
| **Ambulance / response team**  | Acknowledges an incident, travels to the scene, and provides professional care.                                   |

Access: receives role-appropriate incident alerts with minimum necessary information; updates acknowledgement, en-route, arrival, and handover states. Requires identity, training, and credential verification (FR-16).

## Group C — Care coordination professionals (authorised clinical / dispatch staff)

| **Role**                          | **Purpose**                                                                                      |
|-----------------------------------|--------------------------------------------------------------------------------------------------|
| **Medical guidance professional** | Provides remote, situation-appropriate guidance and escalates to emergency services when needed.  |
| **Dispatcher / emergency service**| Receives incident details, coordinates response, and confirms dispatch status.                   |

Access: views assigned incidents, provides guidance, confirms dispatch/escalation. Subject to professional credential checks and audit logging.

## Group D — Administration (platform and facility management)

| **Admin type**                        | **Purpose**                                                                                                  |
|---------------------------------------|--------------------------------------------------------------------------------------------------------------|
| **Platform operations / safety team** | Maintains service quality, handles reports, verifies responders and facilities, and monitors incidents and safety concerns. |
| **Hospital admin**                    | Manages hospital profile, capabilities, availability, and care-team contacts; receives pre-alerts and confirms acknowledgement or patient acceptance on behalf of the receiving hospital / care team. |
| **Dispatch admin (where applicable)** | Manages dispatch centre configuration, coverage areas, and authorised dispatcher accounts.                   |

Access: admin console only; manages accounts, verification status, facility capabilities, and operational monitoring. Hospital admins see only incidents routed or pre-alerted to their facility, with minimum necessary patient information and full audit logging. Hospital admin access can be suspended or revoked.

# 6. Product principles

- **Urgency first:** Do not make completing a questionnaire a
  prerequisite for requesting urgent help.

- **Clarity over assumptions:** Show whether help was requested,
  acknowledged, dispatched, arrived, or completed as distinct statuses.

- **Safe interim guidance:** Instructions must be reviewed by qualified
  clinical and emergency-response experts and tailored to the reported
  situation.

- **Human oversight:** Use professional judgment for clinical
  escalation, responder suitability, and hospital destination decisions.

- **Privacy by default:** Share only necessary information with
  authorised parties for the emergency purpose.

- **Inclusive and simple:** Use plain language, clear buttons, minimal
  typing, and accessible flows for stressed users.

- **Graceful degradation:** Clearly explain unavailable features and
  offer alternatives when connectivity or partner services fail.

# 7. Core user journey

1.  A person opens the platform and chooses the emergency action.

2.  The platform asks a small number of quick questions to understand
    the incident and likely severity. The user can bypass questions to
    request urgent help.

3.  The platform identifies the likely location, displays it for review,
    and allows landmarks or corrections.

4.  Immediate, relevant safety guidance appears while the platform
    offers a connection to a trained medical guidance professional.

5.  The platform helps contact the appropriate established emergency
    service and, where available, coordinates with participating
    ambulance providers and trained responders.

6.  The incident status is updated only when the relevant action is
    confirmed.

7.  The platform helps identify a suitable hospital and shares necessary
    information with the appropriate care team, subject to authorisation
    and local rules.

8.  Selected trusted contacts receive approved progress updates.

9.  The response team arrives and professional care takes over; the
    incident is closed with a clear outcome and appropriate follow-up.

# 8. Functional requirements

Priority key: P0 = essential for a safe first release; P1 = important
follow-on; P2 = later enhancement. Priorities are provisional and should
be validated with emergency-service partners and clinical safety
reviewers.

| **ID**    | **Feature**                          | **Priority**             | **Requirement**                                                                                                                           | **Acceptance criteria**                                                                                                          |
|-----------|--------------------------------------|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| **FR-01** | Emergency reporting                  | P0                       | Users can start an emergency report through a clearly visible primary action.                                                             | The report flow is short and does not block urgent help while collecting nonessential details.                                   |
| **FR-02** | Quick incident questions             | P0                       | The platform asks a few plain-language questions about what happened and the apparent severity.                                           | Questions are easy to answer; an urgent-help path remains available at all times.                                                |
| **FR-03** | Immediate safety guidance            | P0                       | The platform provides reviewed, situation-appropriate interim guidance while help is arranged.                                            | Guidance is clear, actionable, cautious, and does not replace professional care.                                                 |
| **FR-04** | Live professional guidance           | P1                       | The user can request a live connection to a trained medical or emergency guidance professional.                                           | The user can continue to access essential guidance if no professional is available or the connection fails.                      |
| **FR-05** | Location sharing                     | P0                       | The platform identifies and shares the likely emergency location when permission and service conditions allow.                            | The user can correct the location and add road names, landmarks, or other helpful directions.                                    |
| **FR-06** | Emergency service contact            | P0                       | The platform helps the user contact the appropriate established emergency service.                                                        | The user is told clearly whether contact was completed or whether they must call directly.                                       |
| **FR-07** | Partner dispatch coordination        | P1                       | Where partners are available, the platform can send an incident request to participating ambulances or responders.                        | A request is not labelled dispatched until an authorised service confirms dispatch.                                              |
| **FR-08** | Responder acknowledgement and status | P0                       | The platform shows meaningful response states.                                                                                            | Statuses distinguish request sent, acknowledged, dispatched, en route, arrived, cancelled, and unable to respond, as applicable. |
| **FR-09** | Verified nearby responder alerts     | P1                       | Suitable nearby verified responders can be invited to assist when the incident and their training make it appropriate.                    | Only verified responders receive alerts; sensitive details are limited; unsafe situations are excluded.                          |
| **FR-10** | Hospital recommendation              | P1                       | The platform helps identify an appropriate hospital using the emergency type, relevant capabilities, distance, and available information. | Recommendations are coordinated with emergency professionals and do not rely on distance alone.                                  |
| **FR-11** | Hospital pre-alert | P1 | Relevant incident information can be sent to an appropriate receiving hospital via its Hospital admin account. | The platform distinguishes notification sent, acknowledged, and patient acceptance where those states are available.
| **FR-12** | Trusted-contact updates              | P1                       | The user or authorised helper can select trusted contacts for incident updates.                                                           | Only approved contacts receive updates and only necessary information is shared.                                                 |
| **FR-13** | Connectivity-resilient experience    | P0                       | Essential saved guidance remains accessible and alternatives are offered when internet features fail.                                     | The app clearly labels what is unavailable and never falsely claims an action succeeded.                                         |
| **FR-14** | Incident timeline                    | P1                       | Authorised participants can view the incident's relevant status history.                                                                  | The timeline is accurate, role-appropriate, and does not expose restricted information.                                          |
| **FR-15** | Incident closure and follow-up       | P1                       | The incident can be closed when the response has ended, with a clear final status.                                                        | Users can report incorrect information or safety concerns; follow-up does not distract from urgent care.                         |
| **FR-16** | Responder verification               | P0 for responder network | The platform verifies the identity, training, and relevant credentials of people joining the responder network.                           | Verification status can be reviewed and access can be suspended when necessary.                                                  |
| **FR-17** | Accessibility and plain language     | P0                       | Emergency flows use readable text, clear controls, and minimal typing.                                                                    | Key actions remain understandable under stress and support users with different abilities.                                       |
| **FR-18** | Incident operations and escalation   | P0                       | An authorised operations function can monitor failed handoffs, unacknowledged requests, and safety reports.                               | Escalation paths and operational ownership are defined before launch.                                                            |

# 9. Emergency status language

Use explicit, human-readable statuses so people understand what has
actually happened.

| **Status**                  | **Meaning**                                                                                         |
|-----------------------------|-----------------------------------------------------------------------------------------------------|
| **Request started**         | The user has begun reporting an emergency; a service has not necessarily been contacted.            |
| **Request sent**            | An incident request was sent to a named service or partner.                                         |
| **Acknowledged**            | The service or responder has confirmed receipt.                                                     |
| **Dispatched / accepted**   | The service has confirmed it is responding or the hospital (via Hospital admin) has confirmed acceptance, as applicable. |
| **En route**                | A responder has confirmed they are travelling to the scene.                                         |
| **Arrived**                 | A responder has confirmed arrival at the scene.                                                     |
| **Completed / handed over** | The incident has reached a defined end state, such as handover to professional care.                |
| **Unable to confirm**       | The platform cannot verify the status; the user should be given a safe next action.                 |

# 10. Safety, privacy, and trust requirements

- Clinical guidance must be reviewed and approved by qualified clinical
  and emergency-response experts before release.

- The product must clearly state that emergency services should be
  contacted directly when the platform cannot complete a contact or
  dispatch action.

- A failed internet connection must not be represented as a successful
  message, dispatch, location share, or live consultation.

- Location, identity, and medical details must be shared only with
  appropriate, authorised parties and only to the extent needed for the
  response.

- Trusted-contact sharing must be transparent, with a clear indication
  of who will receive updates.

- Responder verification must be proportionate to the role, with a
  process to renew, suspend, or revoke access.

- Volunteer responders must receive only the information needed to
  assess whether they can safely help; they must not be encouraged to
  enter hazardous scenes.

- The product must support reporting of unsafe guidance, false reports,
  misuse, impersonation, or inappropriate access.

- Data retention, consent, emergency exceptions, safeguarding, and
  access rules must be reviewed against the laws and regulations of the
  launch market.

- The platform should maintain an auditable record of key status changes
  and authorised information sharing, consistent with applicable privacy
  rules.

# 11. Connectivity and service failure handling

| **Failure scenario**                           | **Expected behaviour**                                                                                                                              |
|------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| **No reliable internet**                       | Show that online features may not work; keep essential saved guidance available; offer direct call or other locally supported contact alternatives. |
| **Location unavailable or uncertain**          | Ask the user to enter a nearby landmark, road, building, or other location description; do not imply the location is verified.                      |
| **No live medical professional available**     | Continue essential reviewed guidance and show the safest available next step.                                                                       |
| **No ambulance partner available**             | Clearly say no partner dispatch has been confirmed and direct the user to the appropriate established emergency service.                            |
| **Responder declines or does not acknowledge** | Do not count the request as accepted; continue the escalation process where available.                                                              |
| **Hospital cannot accept patient**             | Show that acceptance was not confirmed and coordinate an alternative with emergency professionals.                                                  |
| **Trusted contact cannot be reached**          | Continue the emergency response; do not make contact notification a condition of care.                                                              |

# 12. MVP recommendation and phased delivery

Recommendation: launch in a limited geography with a clearly defined
operating model and participating emergency partners. Do not launch
features that imply reliable dispatch, clinical coverage, or hospital
capacity until those services are actually available and operationally
tested.

## Phase 1 — Safe core emergency experience

- Simple emergency reporting with quick questions and an urgent-help
  path.

- Reviewed, immediately available emergency guidance.

- Location sharing with manual correction and landmark descriptions.

- Clear help-contact alternatives and truthful response statuses.

- Connectivity-resilient handling and transparent failure messages.

- Clinical, privacy, safeguarding, and incident-operations review.

## Phase 2 — Coordinated response partners

- Partner ambulance and established emergency-service coordination where
  agreements and coverage exist.

- Live professional guidance with clear availability and fallback
  behaviour.

- Verified nearby responder network with training-based eligibility and
  safety controls.

- Trusted-contact notifications and incident timeline.

## Phase 3 — Hospital coordination and broader coverage

- Hospital capability information and destination recommendations.

- Hospital pre-alerts and acknowledgement/acceptance status where
  participating facilities support them.

- Expanded coverage, operational reporting, and service-quality
  improvement based on measured results.

# 13. Success measures

Set baseline values during pilot operations; targets should be agreed
with participating emergency services and clinical safety reviewers
rather than guessed.

- Time from emergency report start to first useful guidance shown.

- Time from request to confirmed acknowledgement by an emergency service
  or partner, where measurable.

- Percentage of incidents with a usable location or helpful location
  description.

- Percentage of incidents with clear and accurate response-status
  updates.

- Percentage of dispatch attempts that receive a confirmed outcome.

- Rate of successful connection to a live guidance professional when
  requested and available.

- Rate of trusted-contact notification delivery when enabled.

- Responder verification completion and incident-safety report rates.

- User comprehension of what has and has not been confirmed.

- Clinical safety incidents, privacy incidents, false status reports,
  and inappropriate responder alerts.

# 14. Key risks and mitigations

| **Risk**                                   | **Mitigation**                                                                                                  |
|--------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| **False confidence that help is coming**   | Use explicit status language and never infer dispatch from a sent request.                                      |
| **Unsafe or misunderstood guidance**       | Clinical review, plain-language testing, clear escalation, and ongoing incident review.                         |
| **Unreliable partner availability**        | Launch only with agreed coverage, clear service boundaries, and fallback to established services.               |
| **Incorrect location**                     | Show the location for correction and support landmarks or manual descriptions.                                  |
| **Unverified or unsafe volunteers**        | Verify training and identity, restrict alerts by suitability, and provide reporting/suspension processes.       |
| **Privacy exposure**                       | Role-based access, minimum necessary information, transparent contact sharing, and legal review.                |
| **Hospital capacity information is stale** | Label information by source and confirmation status; coordinate final destination with emergency professionals. |
| **Poor connectivity**                      | Saved guidance, direct contact alternatives, visible failure states, and no false success messages.             |

# 15. Assumptions and open decisions

The following are working assumptions or items to validate before the
product scope is final.

- Initial launch country, city, and service coverage are not yet
  confirmed.

- Emergency-service, ambulance-provider, hospital, and clinical-guidance
  partnerships will need to be established before their availability can
  be promised.

- Clinical guidance content and escalation rules will be reviewed by
  qualified local experts.

- The operating team will define who monitors incidents, follows up on
  unacknowledged requests, and handles safety reports.

- Applicable emergency numbers, communication alternatives, consent
  rules, health-data protections, and retention obligations will be
  confirmed for the launch market.

- The team will decide whether the first release is public-facing only
  or also includes dedicated workflows for dispatchers, responders, and
  hospitals.

- The team will agree on measurable pilot targets after partner
  capabilities and baseline response times are understood.

# 16. Product decision log

| **Decision area**           | **Current product direction**                                                                                          |
|-----------------------------|------------------------------------------------------------------------------------------------------------------------|
| **1. Intended users**       | Everyone: patients, bystanders, family members, and responders.                                                        |
| **2. Emergency activation** | Ask a few quick questions to identify the emergency and severity, while preserving a direct urgent-help path.          |
| **3. Medical guidance**     | Immediate step-by-step instructions plus a live connection to a trained medical professional.                          |
| **4. Dispatch**             | Contact established emergency services and coordinate with available partner ambulances or responders.                 |
| **5. Location**             | Automatic location sharing plus manual correction and landmarks.                                                       |
| **6. Hospital**             | Recommend and coordinate a suitable hospital, notify it early, and coordinate the choice with emergency professionals. |
| **7. Updates**              | Authorised contacts only receive emergency progress updates.                                                           |
| **8. Nearby responders**    | Verified trained responders may be alerted when suitable.                                                              |
| **9. Poor connectivity**    | Recommended default: connectivity-resilient mode with essential guidance, alternatives, and honest status messages.    |

# 17. Definition of a successful pilot

A pilot is ready to be considered successful when users can report an
incident and receive safe initial guidance; location information is
usable; the platform accurately communicates whether help has been
requested or confirmed; the agreed emergency partners understand their
responsibilities; failures have tested fallback paths; and clinical,
privacy, and operational reviewers approve the measured safety and
service outcomes.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>CLOSING PRINCIPLE<br />
</strong>The platform's promise is not that it can guarantee every
service will be available. Its promise is to help people take the next
safest step, coordinate available help, and be honest about what has and
has not happened.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>
