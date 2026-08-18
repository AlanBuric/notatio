# Contributing

Thanks for taking the time. Bug reports, feature requests and pull requests are all welcome.

## Reporting an issue

Open an issue on [GitHub](https://github.com/AlanBuric/notatio/issues). Before you do, please search the existing issues, open and closed, in case it has already come up.

Label the issue with what it is: a bug, a feature request, a performance problem, a documentation gap. If none of the labels fit, say so in the title instead.

Whatever the kind, include a concrete example. What that means in practice:

- **Bug**: the annotation config and the markup it was applied to, what you expected to see, and what you got. A minimal reproduction on CodePen, StackBlitz or similar is the fastest route to a fix. Include the browser and the Notatio version.
- **Feature request**: the use case that led you here, and the code you would like to be able to write. A rough sketch of the API you have in mind helps more than a description of the problem alone.
- **Performance**: how many annotations, on what kind of page, and how you measured it.
- **Documentation**: the passage that misled you and what you expected it to say.

## Pull requests

Fork the repository and work on a branch. Open an issue first for anything larger than a fix, so the approach can be agreed before you write it.

The project uses [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm format
```

Tests run in a real browser through Playwright, so the first run downloads a browser.

Before opening the pull request:

- Cover the change with a test. Bug fixes get a test that fails without the fix.
- Keep `pnpm test`, `pnpm typecheck` and `pnpm lint` green, and run `pnpm format`.
- Update the [API reference](docs/API.md) and the [changelog](CHANGELOG.md) if the change is visible to users.
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) style, as the existing history does.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
