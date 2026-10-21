<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the original main-page settings in app_settings; named pages use landing_pages JSON settings and page_members assignments. Database RLS and can_manage_page enforce isolation; global owners manage all pages while page admins manage only assigned pages.
- Keep named-page APKs under their slug folder in the private apks bucket, and scope visits and query caches by page. Legacy root APKs and visits retain existing staff permissions.
- Use shared DownloadPage rendering for the main and dynamic public pages so their editable fields stay consistent. Assign pending page membership by verified sign-in email, never user-editable metadata.
