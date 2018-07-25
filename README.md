# mail-microservice
Mail micro service for my node apps.

## v2
### Branch: master
Version 2 is an improvement that allows me to plug this into any app backend now.

Features:
- Slack webhook update on exceptions
- Starts with unique port and announces itself to a service registry.
- Reusable with any app.
- Expandable.

Upcoming:
- Add the ability to use different mail services (mailchimp, mailgun, nodemailer).
- Add ability to email maintainers if exceptions occur.

## v1
### Branch: v1
Version 1 was quickly created in order to respond to an influx of new users @ Univjobs.

It served it's purpose but it wasn't very reusable for my other projects. This is mainly due to the fact that it wasn't designed as a service but rather as a separate module to the platform. That being said, here are the pros and cons of this version.

Pros:
- We can re-send failed emails.
- If there is any downtime, we can be sure that these emails will be attempted to be sent when the services comes back online.

Cons:
- It requires access to the database.
- It polls the database for work.
- It's too specific / not generic enough. Can't be plugged into another app.
- If we were to add more instances, there is a chance that we could in a rare case, send the same email more than once (very bad).

These cons are why I decided to update the this repo to use a more traditional micro-service architecture.


