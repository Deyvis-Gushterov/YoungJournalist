# Article display fixes

- Removed the duplicate static comments panel; the article renderer now supplies the single comments section.
- Added support for additional legacy image field names and Storage path/object formats.
- Adjusted desktop navigation spacing and article body line-height.

## Firebase permissions still required

The client cannot bypass Firebase security rules. For publicly visible approved comments, allow public reads at `publicArticleComments` and authenticated submissions at `commentSubmissions` (writes should validate the signed-in author). For images, Firebase Storage must allow reads for the relevant `editorial-media/**` objects. A `storage/unauthorized` error means the Storage rules need adjustment; a `storage/object-not-found` error means the saved path does not match an uploaded object.

Suggested minimal Realtime Database rules entries (merge into the existing `rules` object; do not replace unrelated rules):

```json
{
  "publicArticleComments": { ".read": true, ".write": false },
  "commentSubmissions": { ".read": "auth != null", ".write": "auth != null" }
}
```

For production, tighten `commentSubmissions` writes to validate the author ID and fields, and restrict reads to moderators. Public comment reads are safe only if this path contains approved comments and no private data.

Check Firebase Console → Storage → Rules. Public article images need read access to the objects used by published articles. Keep uploads restricted to authenticated editors/admins.
