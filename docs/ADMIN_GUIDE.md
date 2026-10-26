# Beginner administrator guide

This guide describes the code that is available after Supabase and Cloudflare are connected. These services are not connected yet. Do not use demonstration records as real listings.

## Get access

Create your account through “Client login”, confirm your email, and have the initial administrator role assigned securely by the database owner (see deployment guide). Sign in, open **Account security**, set up an authenticator app and verify its current code. Then use **Administration** from your account dashboard. Each administrator session requires a verified second factor. A normal account cannot grant itself administrator access.

## Add a property

1. Open **Administration → Properties**.
2. Enter the official name/reference, location, size, category and current details.
3. Use a short URL slug, such as `approved-property-name`. Slugs use lowercase letters, digits and hyphens.
4. Leave the price blank if it must be requested. Never guess a price.
5. Enter features one per line. Upload approved photography through Media Library first, then copy its image path.
6. Leave Publish unchecked to save a draft. Check Publish only when MICMU approves the facts and permissions.
7. Select Save property. Refresh the list, use Edit to adjust it, or View published page to inspect it.

To change a price or availability, use Edit and save the new value. Uncheck Publish to withdraw a listing from public browsing. The original record remains for administration; this interface does not delete customer/property data.

## Content and company details

**Content & services** manages articles, estates, developments, confirmed business divisions and additional FAQs. Drafts are private. Plain text is supported; arbitrary HTML is deliberately not accepted. About MICMU, mission, vision and contact/social links are edited under **Company settings**. Official contact links appear only when values are provided. The owner-supplied Facebook link is already recorded.

Homepage composition is currently developer-managed. Featured listings are the three newest published properties. A full homepage layout editor, testimonials editor and preview links for unpublished content are not implemented yet.

## Inquiries and inspections

Open **Enquiries & inspections** to review the latest 100 requests. See the caller's details, message and preferred inspection time. A request begins as pending. Contact the customer using approved company channels, then change its status only when arrangements are agreed. Automatic emails and admin notifications are not connected. Check this queue regularly.

Rescheduling currently uses a support request quoting the booking reference and a new agreed arrangement recorded by staff; a dedicated rescheduling calendar and immutable change history are still needed. Do not treat a status change alone as a notification to the customer.

## Realtor applications

Review experience and contact details. “Approve realtor account” requires the applicant to have a confirmed account using the application email. It grants the realtor role and marks the application approved. It does not set commission terms or financial promises. Referral/commission records are currently entered by authorised database staff; a full financial management interface is deferred.

## Media

R2 must be connected before uploads work. Upload only authorised JPEG/PNG/WebP images, at most 5 MB; use pre-compressed images for mobile delivery. Supply source/permission evidence and a category. Approval makes an image public. Do not upload private documents here. Video workflows, responsive derivatives, media revocation controls and comprehensive image scanning are not yet complete.

Private client PDFs are stored in the private Supabase bucket and assigned in `client_documents` by authorised database staff. Customers receive short-lived access links. A staff document upload/assignment interface is still needed.

## Logs, privacy and maintenance

Audit Log shows recent important changes. Administrator access is powerful: use individual accounts, strong passwords and authenticator MFA. The application and database require a second-factor session for administrator actions. Verify enrollment/recovery on staging before launch. Bootstrap/revoke admin roles through a controlled database-owner process. Define staff access review, data retention and deletion procedures before collecting real enquiries. Back up the database and test restoration. Updates should run the project checks and a staging deployment before production.

## Client PDF marketplace update

The client chose to retain the current technology. The PDF's PHP/MySQL wording does not change the operating instructions.

Apply migrations 003–005 to the staging project after migrations 001–002. New property fields include Purpose (For sale/For rent), Price period (Total/Year/Month), State/LGA/City/Area, Furnishing, Review status and Feature on homepage. Rental records must choose Month or Year; sale records must use Total. “Rented” belongs to rentals and “Sold” to sales. Approval must be set to Approved before Publish is checked. Legacy published properties are marked approved by the additive migration; other existing records remain Pending.

Additional approved image paths can be entered one per line in the property editor. Videos use YouTube/Vimeo HTTPS links; tours use HTTPS links. Supply both latitude and longitude or leave both blank. These external resources open only when a visitor chooses them. Gallery source images still need the production compression pipeline.

Archive property removes a listing from public browsing and preserves its records/history. Restore returns it as an unpublished draft. This intentionally avoids destructive deletion of property history.

Company settings now includes homepage headline and introduction text. Blank fields retain the design default. In Content & services, testimonial Title is the approved customer name, Summary the approved relationship and Body the authorised quote. Team profiles use name, role and biography. Obtain permission before publishing either. No sample testimonials/team profiles are seeded.

Account dashboards now offer Saved searches, Recently viewed and Notifications. Recent history stays only on the visitor’s device and can be cleared there. Saved searches do not yet generate new-listing alerts. Dashboard notifications do not send email or WhatsApp messages.
