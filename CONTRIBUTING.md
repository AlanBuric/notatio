# Contributing

Thank you for your interest and taking the time in this project! Bug reports, feature requests and pull requests are all welcome.

## Reporting an issue

Please research the existing issues, open and closed, in case your request has already come up. If it has, you can add a comment to it instead of creating a new issue.
Otherwise, open an issue on the repository's [GitHub Issues](https://github.com/AlanBuric/notatio/issues) page.

Label the issue with what it is: a bug, a feature request, a performance or documentation problem. It's okay if none of the labels fit.

Include a concrete example depending on the type of issue:

- **Bug**: the annotation config and the markup it was applied to, what you expected to see, and what you actually got. Having a minimal reproduction code or description helps a lot and speeds up troubleshooting. Include the browser and the Notatio version.
- **Feature request**: the use case that led you here, and the code you would like to be able to write. A rough sketch of the API you have in mind helps more than a description of the problem alone.
- **Performance**: how many annotations, on what kind of page, and how you measured it.
- **Documentation**: the passage that misled you and what you expected it to say, or what's missing.

## Pull requests

Open an issue first proposing your solution, so an approach can be agreed upon before you write it.
Once ready, fork the repository, write your changes in a branch, and open a pull request for merging into this repository's main branch!

**Before opening the pull request:**

- [ ] Add test coverage for your change. Bug fixes should especially have at least one test that fails without the fix for reproducibility and proof.
- [ ] `pnpm test`, `pnpm typecheck` and `pnpm lint` are required to pass.
- [ ] Run `pnpm format` if you already haven't formatted your changes through your IDE.
- [ ] Update the [API reference](docs/REFERENCE.md) and the [changelog](CHANGELOG.md) if the change is visible to users.
- [ ] Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) style, as the existing history does; at least the pull request title, if anything.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

### Project setup

**Requirements:** Node.js and pnpm installed.

Then run:

```
pnpm install
```

More scripts are available in [package.json](package.json).
