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
- Payroll data is stored in browser localStorage via src/lib/payroll.ts; why: single-owner app, no backend yet.
- Durability comes from a user-triggered JSON backup (downloadBackup/readBackup in src/lib/payroll.ts), not cloud; why: the user declined an account, so keep restore local, validated, and confirm before replacing live data.
