# RTL and Accessibility Review

- Root direction is RTL and Alexandria is inherited from the application foundation.
- Codes, phone numbers, money, and references use isolated LTR `bdi` values.
- Forms use labels, field errors use live alerts, dialogs manage focus, statuses include text, and uploads expose keyboard focus.
- Playwright axe and keyboard journeys cover list, create, detail, and edit routes. Theme tokens preserve light/dark contrast.
