# Young Journalist — editorial platform

A school newspaper website built with HTML, CSS, vanilla JavaScript and Firebase (Authentication, Realtime Database and Storage). The design keeps the printed-newspaper identity while adding a real publishing workflow.

## Main pages

- `index.html` — homepage, monthly spotlight, four editorial sections, poll, latest articles, team, contact and join-the-team application form.
- `page-articles.html` — public archive of published articles with search and category filters.
- `page-article.html?id=ARTICLE_ID` — individual article reader, image gallery, YouTube/TikTok embed and moderated comments.
- `page-rubrics-public.html` — public rubric archive, grouped into School Life, Creativity & Culture, Useful & Interesting, and Free Time.
- `page-calendar.html` — public monthly calendar and event agenda.
- `page-admin.html` — role-aware editorial studio.

## Editorial roles

| Role | Studio permissions |
|---|---|
| `admin` | All sections, role assignment, applications, spotlight, moderation and publishing |
| `redactor` / `editor` | Review, edit and publish articles; create/edit rubrics; manage events; moderate comments |
| `reporter` | Create articles and send them to the editorial review queue |
| `photographer` | Upload and manage their own media library |
| `designer` | Upload media and create/edit rubrics |
| `user` | Read public content and submit a team application |

Role checks in the interface are for usability only. The Firebase Realtime Database and Storage rules are the actual access controls.

## Publishing workflows

### Articles

1. A reporter creates an article in the Editorial Studio. It is saved under `articles/{id}` with `status: "submitted"`.
2. A redactor/editor/admin reviews the submission and can edit or publish it.
3. Publishing writes the internal record to `articles/{id}` and a public copy to `publishedArticles/{id}`.
4. Public archive and article reader pages read from `publishedArticles` only. Drafts and submissions therefore do not need to be exposed to anonymous visitors.
5. Existing records that have `status: "published"` (or are older records without a status) can be copied to the public collection by the admin migration on first studio load. Review the migration notice before using it on a production database.

### Rubrics

Authorized editors/designers create and edit rubric materials in the studio. Materials are written to `rubrics/{id}` and immediately appear on the public Rubrics page and the four homepage sections. Each rubric supports a cover image and optional tags.

### Calendar

Authorized editors add an event with title, description, local date/time and location. It is saved to `events/{id}` and appears on the public month calendar and agenda.

### Applications

Visitors can submit the homepage form and choose a desired role (reporter, photographer, designer or redactor). Applications are saved under `applications/{id}` and visible only to admins. Approval records the recommended role; after the applicant creates an account, an admin assigns that role to the matching Firebase UID in the Studio's Team/Roles section.

### Images and video

Article/rubric/media uploads use Cloudinary under `editorial-media/{uid}/...`. Each file must be JPEG, PNG, WEBP or GIF and no larger than 8 MB. Images can also be linked via an HTTPS URL. Article videos accept YouTube and TikTok URLs. Only use media the school/editorial team has permission to publish.

### Comments

Signed-in readers can submit a comment (maximum 500 characters). New comments remain under `commentSubmissions/{articleId}` until an editor approves them. Approved comments are copied to `publicArticleComments/{articleId}` and shown below the article.

## Run locally

Do not open the pages through `file://`. From this folder run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Firebase configuration and deployment

The current web config in `js-auth-firebase-config.js` points to project ID `account-checker-6aa7f`. Confirm that this is the correct Firebase project for the newspaper before deploying. If it is not, replace the web app configuration values using Firebase Console → Project settings → Your apps.

The current file does not hard-code a Realtime Database URL because the exact database instance and region cannot be inferred reliably from the project ID. In Firebase Console → Realtime Database, copy the exact URL and add it to the `firebaseConfig` object as `databaseURL` in `js-auth-firebase-config.js`. It commonly has one of these forms, but use the actual URL shown in your console:

```js
// Example shape only — replace with the exact URL from Firebase Console.
databaseURL: "https://<database-name>.<region>.firebasedatabase.app",
```

Before launch:

1. In Firebase Console, enable Authentication → Sign-in method → Email/Password.
2. Create/confirm a Realtime Database instance in the same project and set its exact `databaseURL` in the config.
3. Create a free Cloudinary account and configure `js-cloudinary-config.js` (see `CLOUDINARY-SETUP-BG.md`).
4. Add your local/production host under Authentication → Settings → Authorized domains.
5. Back up your current Realtime Database rules and data.
6. Review `firebase-database.rules.json` against the actual database and test with a normal user, reporter, editor and admin using Firebase Rules Playground. Then publish the rules.
7. Configure the Cloudinary unsigned upload preset as described in `CLOUDINARY-SETUP-BG.md`.
8. Register a trusted administrator account. Copy its Authentication UID and set `users/{UID}/role` to `admin` in the Firebase Console. There is no public self-promotion route.
9. Sign in as that admin and open `page-admin.html`. Review the article migration notice before allowing it to copy older published records into `publishedArticles`.

The rules file is a role-based starting configuration for the paths used by this version. It is not safe to overwrite production rules without reviewing existing workflows/data first. Application submissions are intentionally unauthenticated; the form includes a honeypot and rules enforce field lengths, but a public production deployment should add App Check and/or a CAPTCHA/rate-limiting service to reduce spam.

## Firebase data paths used

- `users/{uid}` — profile and role
- `articles/{id}` — drafts, submissions and editorial records
- `publishedArticles/{id}` — public article copies
- `rubrics/{id}` — public rubric material
- `events/{id}` — public calendar events
- `applications/{id}` — private join-the-team applications
- `commentSubmissions/{articleId}/{commentId}` — pending comments
- `publicArticleComments/{articleId}/{commentId}` — approved comments
- `mediaLibrary/{id}` — metadata for uploaded images
- `siteContent/spotlight` — homepage spotlight content
- `polls/{pollId}/votes/{option}` — poll counters

## What has and has not been tested

Static checks in this package include JavaScript syntax validation, HTML inline-script syntax validation, relative local asset checks, JSON parsing of Realtime Database rules, and ZIP integrity validation. These checks do not verify a live Firebase project. Live sign-in, database permissions, file uploads, role changes and published content must be tested after the correct database URL and rules are configured in your Firebase project.


## Редакционен модел
- `admin`: двата съществуващи администраторски профила; управление на екипа, кандидатури, публикации, рубрики, календар, коментари и акцент на месеца.
- `redactor` / `editor`: редакторски права за статии, рубрики, календар и модерация.
- `reporter`: изпраща статии за редакторски преглед.
- `photographer`: качва снимки в медийната библиотека.
- `designer`: управлява визуални материали и рубрики.
- `user`: читателски профил и коментари след вход.

Кандидатурите се изпращат през формата в долната част на началната страница. Администраторите могат да ги одобрят/откажат; ако кандидатът вече има профил, при одобрение се задава избраната роля. Ако още няма профил, одобрението се записва и ролята се задава от раздел „Екип“ след регистрация.

Публичният архив чете `publishedArticles`, докато черновите и подадените за преглед статии остават в `articles`. При първо влизане администраторът може да синхронизира старите публикации чрез миграцията в редакционното студио.
