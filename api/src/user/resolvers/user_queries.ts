import { Stores } from "../../schema/stores";
import { Context } from "../../context";
import GitHubApi from "@octokit/rest";
import { ReplicatedError } from "../../server/errors";
import { kotsTestRegistryCredentials } from "../../kots_app/kots_ffi";

export function UserQueries(stores: Stores) {
  return {
    async userInfo(root: any, args: any, context: Context) {
      if (context.sessionType() === "github") {
        const github = new GitHubApi();
        github.authenticate({
          type: "token",
          token: context.getGitHubToken(),
        });

        const githubUser = await github.users.getAuthenticated({});
        return {
          avatarUrl: githubUser.data.avatar_url,
          username: githubUser.data.login
        }
      } else if (context.sessionType() === "ship") {
        return {
          avatarUrl: "",
          username: "test"
        }
      } else {
        throw new ReplicatedError(`Unknown session type`);
      }
    },

    async validateRegistryInfo(root: any, {slug, endpoint, username, password, org}: any, context: Context): Promise<String> {
      if (password === stores.kotsAppStore.getPasswordMask()) {
        const appId = await stores.kotsAppStore.getIdFromSlug(slug);
        const details = await stores.kotsAppStore.getAppRegistryDetails(appId);
        password = details.registryPassword;
      }

      const errorText = await kotsTestRegistryCredentials(endpoint, username, password, org);
      return errorText;
    },
  }
}


