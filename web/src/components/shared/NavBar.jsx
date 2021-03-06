import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { Link, withRouter } from "react-router-dom";
import { compose, withApollo, graphql } from "react-apollo";

import { Utilities } from "@src/utilities/utilities";
import { listClusters } from "@src/queries/ClusterQueries";
import { userInfo } from "@src/queries/UserQueries";
import { getKotsLicenseType } from "@src/queries/AppsQueries";
import { logout } from "@src/mutations/GitHubMutations";
import Avatar from "../shared/Avatar";

import "@src/scss/components/shared/NavBar.scss";

export class NavBar extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      licenseType: "",
      selectedTab: ""
    };
  }

  static propTypes = {
    refetchListApps: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired
  }

  handleLogOut = async (e) => {
    e.preventDefault();
    await this.props.logout()
      .catch((err) => {
        console.log(err);
      })
    Utilities.logoutUser();
  }

  componentDidUpdate(lastProps) {
    if (Utilities.isLoggedIn() && !this.state.user) {
      this.props.client.query({ query: userInfo })
        .then((res) => {
          this.setState({ user: res.data.userInfo });
        }).catch(() => {
          Utilities.logoutUser();
        });
    }

    const { pathname } = this.props.location;
    if (pathname !== lastProps.location.pathname) {
      this.setSelectedTab();
      this.getKotsLicenseType();
    }
  }

  componentDidMount() {
    if (Utilities.isLoggedIn()) {
      this.getKotsLicenseType();
      this.props.client.query({ query: userInfo })
        .then((res) => {
          this.setState({ user: res.data.userInfo });
        }).catch();
    }
    this.setSelectedTab();
  }

  setSelectedTab = () => {
    const { pathname } = this.props.location;
    let selectedTab = "";
    if (pathname === "/gitops") {
      selectedTab = "gitops";
    } else if (pathname === "/cluster/manage") {
      selectedTab = "cluster_management";
    } else if (pathname.startsWith("/app")) {
      selectedTab = "dashboard"
    }
    this.setState({ selectedTab });
  }

  getKotsLicenseType = () => {
    const { location } = this.props;
    const pathname = location.pathname.split("/");
    if (pathname.length > 2 && pathname[1] === "app") {
      this.props.client.query({
        query: getKotsLicenseType,
        fetchPolicy: "no-cache",
        variables: {
          slug: pathname[2],
        }
      })
        .then(response => {
          this.setState({ licenseType: response.data.getKotsLicenseType });
        })
        .catch((err) => {
          console.log(err);
        })
    }
  }

  handleGoToGitOps = () => {
    if (this.props.location.pathname === "/gitops") {
      this.props.client.query({
        query: listClusters,
        fetchPolicy: "network-only",
      });
    } else {
      this.props.history.push("/gitops");
    }
  }

  handleGoToClusterManagement = () => {
    this.props.history.push("/cluster/manage");
  }

  handleAddNewApplication = () => {
    this.props.history.push("/upload-license");
  }

  redirectToDashboard = () => {
    const { refetchListApps, history } = this.props;
    refetchListApps().then(() => {
      history.push("/");
    });
  }

  render() {
    const { className, logo, fetchingMetadata, isKurlEnabled, isGitOpsSupported } = this.props;
    const { user, licenseType, selectedTab } = this.state;

    const isClusterScope = this.props.location.pathname.includes("/clusterscope");
    return (
      <div className={classNames("NavBarWrapper flex flex-auto", className, {
        "cluster-scope": isClusterScope
      })}>
        <div className="container flex flex1">
          <div className="flex1 justifyContent--flexStart">
            <div className="flex1 flex u-height--full">
              <div className="flex flex-auto">
                <div className="flex alignItems--center flex1 flex-verticalCenter u-position--relative u-marginRight--20">
                  <div className="HeaderLogo">
                    <Link to={isClusterScope ? "/clusterscope" : "/"} tabIndex="-1">
                      {logo
                        ? <span className="watch-logo clickable" style={{ backgroundImage: `url(${logo})` }} />
                        : !fetchingMetadata ? <span className="logo icon clickable" />
                          : <span style={{ width: "30px", height: "30px" }} />
                      }
                      {licenseType === "community" && <span className="flag flex"> <span className="flagText">Community Edition</span> </span>}
                    </Link>
                  </div>
                </div>
                {Utilities.isLoggedIn() && (
                  <div className="flex flex-auto left-items">
                    <div className={classNames("NavItem u-position--relative flex", { "is-active": selectedTab === "dashboard" })}>
                      <span className="HeaderLink flex flex1 u-cursor--pointer" onClick={this.redirectToDashboard}>
                        <span className="text u-fontSize--normal u-fontWeight--medium flex-column justifyContent--center">
                          <span>Dashboard</span>
                        </span>
                      </span>
                    </div>
                    {isGitOpsSupported &&
                      <div className={classNames("NavItem u-position--relative flex", { "is-active": selectedTab === "gitops" })}>
                        <span className="HeaderLink flex flex1 u-cursor--pointer" onClick={this.handleGoToGitOps}>
                          <span className="text u-fontSize--normal u-fontWeight--medium flex-column justifyContent--center">
                            <span>GitOps</span>
                          </span>
                        </span>
                      </div>
                    }
                    {isKurlEnabled &&
                      <div className={classNames("NavItem u-position--relative flex", { "is-active": selectedTab === "cluster_management" })}>
                        <span className="HeaderLink flex flex1 u-cursor--pointer" onClick={this.handleGoToClusterManagement}>
                          <span className="text u-fontSize--normal u-fontWeight--medium flex-column justifyContent--center">
                            <span>Cluster Management</span>
                          </span>
                        </span>
                      </div>
                    }
                  </div>
                )
                }
              </div>
              {Utilities.isLoggedIn() ?
                <div className="flex flex1 justifyContent--flexEnd right-items">
                  <div className="flex-column flex-auto u-marginRight--20 justifyContent--center">
                    <Link className="btn secondary blue rounded" to="/upload-license">
                      Add a new application
                    </Link>
                  </div>
                  <div className="flex-column flex-auto justifyContent--center">
                    <p data-qa="Navbar--logOutButton" className="NavItem" onClick={this.handleLogOut}>Log out</p>
                  </div>
                  {user && user.avatarUrl !== "" ?
                    <div className="flex-column flex-auto justifyContent--center u-marginLeft--10">
                      <Avatar imageUrl={this.state.user && this.state.user.avatarUrl} />
                    </div>
                    : null}
                </div>
                : null}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default compose(
  withRouter,
  withApollo,
  graphql(logout, {
    props: ({ mutate }) => ({
      logout: () => mutate()
    })
  }),
)(NavBar);
