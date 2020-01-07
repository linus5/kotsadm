import React, { Component } from "react";
import { Link } from "react-router-dom";
import { graphql, compose, withApollo } from "react-apollo";
import { Helmet } from "react-helmet";
import { withRouter } from "react-router-dom";
import Modal from "react-modal";
import MonacoEditor from "react-monaco-editor"; 
import CodeSnippet from "./shared/CodeSnippet";
import { getKotsPreflightResult, getLatestKotsPreflightResult, getPreflightCommand } from "@src/queries/AppsQueries";
import { deployKotsVersion } from "@src/mutations/AppsMutations";
import Loader from "./shared/Loader";
import PreflightRenderer from "./PreflightRenderer";
import { getPreflightResultState } from "../utilities/utilities";
import "../scss/components/PreflightCheckPage.scss";
import { ignorePreflightPermissionErrors } from "../mutations/AppsMutations";

class PreflightResultPage extends Component {
  state = {
    showSkipModal: false,
    showWarningModal: false,
    showErrorDetails: false,
  };

  async componentWillUnmount() {
    if (this.props.fromLicenseFlow && this.props.refetchListApps) {
      await this.props.refetchListApps();
    }
  }

  deployKotsDownstream = async (force = false) => {
    try {
      const { data, history, match } = this.props;
      const preflightResultData = data.getKotsPreflightResult || data.getLatestKotsPreflightResult;

      const preflightResults = JSON.parse(preflightResultData?.result);
      const preflightState = getPreflightResultState(preflightResults);
      if (preflightState !== "pass" && !force) {
        this.showWarningModal();
        return;
      }

      const sequence = match.params.sequence ? parseInt(match.params.sequence, 10) : 0;
      await this.props.deployKotsVersion(preflightResultData.appSlug, sequence, preflightResultData.clusterSlug);

      history.push(`/app/${preflightResultData.appSlug}/version-history`);
    } catch (error) {
      console.log(error);
    }
  }

  showSkipModal = () => {
    this.setState({
      showSkipModal: true
    })
  }

  hideSkipModal = () => {
    this.setState({
      showSkipModal: false
    });
  }

  showWarningModal = () => {
    this.setState({
      showWarningModal: true
    })
  }

  hideWarningModal = () => {
    this.setState({
      showWarningModal: false
    });
  }

  ignorePermissionErrors = () => {
    const preflightResultData = this.props.data.getKotsPreflightResult || this.props.data.getLatestKotsPreflightResult;
    const sequence = this.props.match.params.sequence ? parseInt(this.props.match.params.sequence, 10) : 0;
    this.props.client.mutate({
      mutation: ignorePreflightPermissionErrors,
      variables: {
        appSlug: preflightResultData.appSlug,
        clusterSlug: preflightResultData.clusterSlug,
        sequence: sequence,
      },
    }).then(() => {
      this.props.data.refetch();
    });
  }

  toggleShowErrorDetails = () => {
    this.setState({
      showErrorDetails: !this.state.showErrorDetails
    })
  }

  retryResults = () => {
    this.props.data.refetch();
  }

  renderErrors = (errors) => {
    const valueFromAPI = errors.map(error => {
      return error.error;
    }).join("\n");

    return (
      <div className="flex flex1 flex-column">
        <div className="flex flex1 u-height--full u-width--full u-marginTop--5 u-marginBottom--20">
          <div className="flex-column u-width--full u-overflow--hidden u-paddingTop--30 u-paddingBottom--5 alignItems--center justifyContent--center">
            <div className="PreChecksBox-wrapper flex-column u-padding--20">
              <div className="flex">
                {this.props.logo &&
                  <div className="flex-auto u-marginRight--10">
                    <div className="watch-icon" style={{ backgroundImage: `url(${this.props.logo})`, width: "36px", height: "36px" }}></div>
                  </div>
                }
                <h2 className="u-fontSize--largest u-color--tuna u-fontWeight--bold u-lineHeight--normal">Unable to automatically run preflight checks</h2>
              </div>
              <p className="u-marginTop--10 u-marginBottom--10 u-fontSize--normal u-lineHeight--normal u-color--dustyGray u-fontWeight--normal">
                The Kubernetes RBAC policy that the Admin Console is running with does not have access to complete the Preflight Checks. It’s recommended that you run these manually before proceeding.
              </p>
              <p className="replicated-link u-fontSize--normal u-marginBottom--10" onClick={this.toggleShowErrorDetails}>{this.state.showErrorDetails ? "Hide details" : "Show details"}</p>
              {this.state.showErrorDetails &&
                <div className="flex-column flex flex1 monaco-editor-wrapper u-border--gray">
                  <MonacoEditor
                    language="bash"
                    value={valueFromAPI}
                    height="300"
                    width="100%"
                    options={{
                      readOnly: true,
                      contextmenu: false,
                      minimap: {
                        enabled: false
                      },
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              }
              <div className="u-marginTop--20">
                <h2 className="u-fontSize--largest u-color--tuna u-fontWeight--bold u-lineHeight--normal">Run Preflight Checks Manually</h2>
                <p className="u-fontSize--normal u-color--dustyGray u-lineHeight--normal u-marginBottom--20">Run the commands below from your workstation to complete the Preflight Checks.</p>
                <CodeSnippet
                  language="bash"
                  canCopy={true}
                  onCopyText={<span className="u-color--chateauGreen">Command has been copied to your clipboard</span>}
                >
                  {this.props.getPreflightCommand?.getPreflightCommand ? this.props.getPreflightCommand?.getPreflightCommand : this.props.getPreflightCommand.error ? "There was an error generating the commands, please try again." : "Getting commands..."}
                </CodeSnippet>
              </div>
              <div className="u-marginTop--30 flex justifyContent--flexEnd">
                <span className="replicated-link u-fontSize--normal" onClick={this.retryResults}>Try again</span>
                <span className="replicated-link u-marginLeft--20 u-fontSize--normal" onClick={this.ignorePermissionErrors}>
                  Proceed with limited Preflights
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  render() {
    const { data } = this.props;
    const { showSkipModal, showWarningModal } = this.state;
    const isLoading = data.loading;

    const preflightResultData = isLoading
      ? null
      : data.getKotsPreflightResult || data.getLatestKotsPreflightResult;
    const hasData = preflightResultData?.result;
    let preflightJSON = {};
    if (hasData) {
      data.stopPolling();
      if (showSkipModal) {
        this.hideSkipModal();
      }
      
      preflightJSON = JSON.parse(preflightResultData?.result);
    }
  
    return (
      <div className="flex-column flex1 container">
        <Helmet>
          <title>{`${this.props.appName ? `${this.props.appName} Admin Console` : "Admin Console"}`}</title>
        </Helmet>
        <div className="flex1 flex u-overflow--auto">
          <div className="PreflightChecks--wrapper flex flex-column u-paddingTop--30 u-overflow--hidden">
            {this.props.history.location.pathname.includes("version-history") &&
            <div className="u-fontWeight--bold u-color--royalBlue u-cursor--pointer" onClick={() => this.props.history.goBack()}>
              <span className="icon clickable backArrow-icon u-marginRight--10" style={{ verticalAlign: "0" }} />
                Back
            </div>}
            <div className="u-minWidth--full u-minHeight--full u-marginTop--20 u-overflow--auto">
              <p className="u-fontSize--header u-color--tuna u-fontWeight--bold">
                Preflight checks
              </p>
              <p className="u-fontWeight--medium u-lineHeight--more u-marginTop--5 u-marginBottom--10">
                Preflight checks validate that your cluster will meet the minimum requirements. If your cluster does not meet the requirements you can still proceed, but understand that things might not work properly.
              </p>
              {(isLoading || !hasData) && (
                <div className="flex-column justifyContent--center alignItems--center u-minHeight--full u-minWidth--full">
                  <Loader size="60" />
                </div>
              )}
              {preflightJSON?.errors && this.renderErrors(preflightJSON?.errors) }
              {hasData && !preflightJSON.errors ? (
                <div className="flex-column">
                  <PreflightRenderer
                    className="u-marginTop--20"
                    results={preflightResultData.result}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {preflightJSON.errors ? null : hasData ? (
          <div className="flex-auto flex justifyContent--flexEnd">
            <button
              type="button"
              className="btn primary blue u-marginBottom--15"
              onClick={() => this.deployKotsDownstream(false)}
            >
              Continue
            </button>
          </div>
        ) : (
            <div className="flex-auto flex justifyContent--flexEnd">
              <button
                type="button"
                className="btn primary blue u-marginBottom--15"
                onClick={this.showSkipModal}
              >
                Skip
            </button>
            </div>
          )}

        <Modal
          isOpen={showSkipModal}
          onRequestClose={this.hideSkipModal}
          shouldReturnFocusAfterClose={false}
          contentLabel="Skip preflight checks"
          ariaHideApp={false}
          className="Modal"
        >
          <div className="Modal-body">

            <p className="u-fontSize--normal u-color--dustyGray u-lineHeight--normal u-marginBottom--20">Skipping preflight checks will not cancel them. They will continue to run in the background. Do you want to continue to the {preflightResultData?.appSlug} dashboard? </p>
            <div className="u-marginTop--10 flex justifyContent--flexEnd">
              <Link to={`/app/${preflightResultData?.appSlug}`}>
                <button type="button" className="btn blue primary">Go to Dashboard</button>
              </Link>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showWarningModal}
          onRequestClose={this.hideWarningModal}
          shouldReturnFocusAfterClose={false}
          contentLabel="Preflight shows some issues"
          ariaHideApp={false}
          className="Modal"
        >
          <div className="Modal-body">

            <p className="u-fontSize--normal u-color--dustyGray u-lineHeight--normal u-marginBottom--20">Preflight is showing some issues, are you sure you want to continue?</p>
            <div className="u-marginTop--10 flex justifyContent--flexEnd">
              <button type="button" className="btn secondary" onClick={this.hideWarningModal}>Cancel</button>
              <button type="button" className="btn blue primary u-marginLeft--10" onClick={() => this.deployKotsDownstream(true)}>
                Deploy and continue
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}

export default compose(
  withApollo,
  withRouter,
  graphql(getKotsPreflightResult, {
    skip: props => {
      const { match } = props;
      return !match.params.downstreamSlug;
    },
    options: props => {
      const { match } = props;

      return {
        pollInterval: 2000,
        variables: {
          appSlug: match.params.slug,
          clusterSlug: match.params.downstreamSlug,
          sequence: match.params.sequence
        }
      };
    }
  }),
  graphql(getPreflightCommand, {
    name: "getPreflightCommand",
    options: props => {
      const { match } = props
      return {
        variables: {
          appSlug: match.params.slug,
          clusterSlug: match.params.downstreamSlug,
          sequence: match.params.sequence,
        }
      }
    }
  }),
  graphql(getLatestKotsPreflightResult, {
    skip: props => {
      const { match } = props;

      return !!match.params.downstreamSlug;
    },
    options: () => {
      return {
        pollInterval: 2000
      }
    }
  }),
  graphql(deployKotsVersion, {
    props: ({ mutate }) => ({
      deployKotsVersion: (upstreamSlug, sequence, clusterSlug) => mutate({ variables: { upstreamSlug, sequence, clusterSlug } })
    })
  }),
)(PreflightResultPage);
