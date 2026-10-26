# v2: a reusable workflow instead of hand-rolled CI steps

## The problem

Today, a content repo's deploy workflow (e.g.
`nichiyoh-catalog-contents/.github/workflows/deploy.yml`) hand-rolls every
step itself: check out `catalog-maker` at a pinned ref, check out its own
content, set up Node, run `build.mjs`, run its tests, then push the
output. That's ~30 lines of boilerplate that every new customer repo has
to copy and keep in sync by hand. If the build invocation ever changes
(a new required flag, a different Node version), every customer's
workflow needs a matching edit.

## The fix: a GitHub Actions *reusable workflow*

GitHub Actions lets one repo define a workflow that other repos' workflows
can call directly, the same way a function call works. Instead of
copy-pasting steps, a content repo's workflow becomes a few lines that
delegate to `catalog-maker`'s own workflow definition:

```yaml
# nichiyoh-catalog-contents/.github/workflows/deploy.yml (v2)
on:
  push: { branches: [main] }
  workflow_dispatch:
jobs:
  deploy:
    uses: 87zero/catalog-maker/.github/workflows/build-and-publish.yml@v2.0.0
    with:
      output_repository: 87zero/nichiyoh-catalog
    secrets:
      deploy_token: ${{ secrets.NICHIYOH_CATALOG_DEPLOY_TOKEN }}
```

`catalog-maker` owns the actual steps (checkout, build, test, publish) in
its own `.github/workflows/build-and-publish.yml`, declared with
`on: workflow_call` plus typed `inputs:` (e.g. `output_repository`) and a
`secrets:` block for the deploy token. Every customer repo's workflow
file shrinks to the same few lines above, with only `output_repository`
and the secret name differing.

## What changes when `catalog-maker` is updated

Right now, fixing something in the build pipeline (like the Node-version
pin or the test-glob fix made during the Nichiyoh launch) means editing
every content repo's workflow file individually. With a reusable
workflow, those fixes live once in `catalog-maker`, and a content repo
picks them up just by bumping the version tag it references
(`@v2.0.0` → `@v2.1.0`), the same way it already pins the engine's git
ref for the build step.

## What stays the same

- The engine itself (`build.mjs`, `folder-catalogs.mjs`) doesn't change —
  this is purely about who owns the CI *steps*, not the build logic.
- A content repo still owns its own catalog data, template, and the
  choice of which version to pin.

## Open question before building this

`peaceiris/actions-gh-pages` needs the caller's `secrets.deploy_token`
passed through explicitly (`secrets: inherit` would leak *all* of the
caller's secrets into `catalog-maker`'s workflow, which is broader than
necessary) — the example above does this correctly with a named
`secrets:` block, but it's worth deciding now whether future inputs
(e.g. a custom Node version, or an optional test-skip flag) are worth
adding on day one or only once a second real customer needs them.
