# Documentation style guide

This guide describes how we write. It is short on ceremony and long on clarity. Use prose for context and understanding, and use numbered steps only when order matters. Include only the sections that add value for this task and this reader; omit everything else.

Headings use sentence case. Avoid Title Case.

## Purpose

Readers come here to succeed, not to admire our writing. We respect their time and intelligence. We explain enough for them to understand the system, not just click buttons. When a task is stressful, we write to calm and guide. When a task is technical, we write to inform precisely.

## Voice and person

You should write in the active voice and present tense, using plain language. The person you use depends on the audience. For end-users (individuals, employees, administrators), use the second person ("you") with a calm, supportive, and brief tone, and, when appropriate, offer a fallback path.

The tone should be adjusted to the expected audience of the article. For example when writing content for tenant administrators, you can be more direct and complete in your explanations, and should include the consequences of changes.

For technical material written as reference and explanations, switch to a precise and neutral third person. Explanation documents explain the model and the "why".

All **reference** material, such as API documentation or error catalogs, must be in the third person, presenting exact information with no opinions or filler.

## Core principles

Use paragraphs to give context, explain prerequisites, decisions, consequences and outcomes. Use numbered lists only when actually describing sequence of actions, and bullet points only for listing alternatives and for link lists. Respect the reader by assuming their competence and focus on explaining systems, not just UI labels. 

Empathy matters, especially for tasks a user might perform under stress; in these cases, your writing should be calm, reassuring, and provide clear fallback options. State the underlying rules explicitly (e.g., "The invitation link expires in 3 days").

## When to include sections

Do not add headings just for the sake of structure. If a section would only say "none" or restate its own title, you should delete it. All articles should have an introduction (which doesn't need its own heading). Include **Prerequisites** only when there is a real gate to the task, such as a required permission, a specific resource, an environmental constraint, or an irreversible effect.

Some tasks will require a **Security considerations** section. The **Steps** section is a natural fit for "how-to" style articles and should present a numbered sequence. You can add a brief "why" if an action isn't obvious. A **Verify** section is useful when a result isn't self-evident, such as for an asynchronous process, but you can otherwise fold the confirmation into the final step. Include **Troubleshooting** when common, fixable failure modes exist, and provide specific next actions. Lastly, a **Learn more** section can point the reader to a natural next document, like a related concept page or reference entry.

## How to author an article

1. Identify the audience and the article format from the Diátaxis framework (how-to, tutorial, reference, explanation). Review related articles for consistency.
2. Make sure your article has a clear purpose and outcome.
3.  Decide which sections are justified (using the rules above).
4.  Write the steps as a minimal sequence. Sometimes a step may involve multiple clicks, and that is ok. You may want to add a screenshot, highlighting the relevant areas and the sequence of clicks.
5.  Add the necessary context and nothing extra.
6.  Link to concepts and reference where depth belongs.
7.  Read it as the target reader.

## Language and formatting

Write plainly, with one idea per sentence and short paragraphs. Use correct names and casing from the official specs, such as OpenID Connect (OIDC), OAuth 2.0, Identity Provider (IdP), and Access Token. For inline literals like scope names `openid` or config keys `token_lifetime_minutes`, use backticks. When creating links, use descriptive text like "See Back-channel logout" instead of "click here." Your examples should be minimal yet complete. Finally, ensure your language is inclusive by using terms like allowlist/denylist and providing alt text for images.

Avoid title case.
