import React, { Component } from "react";
import Select from "react-select";
// import { graphql, compose, withApollo } from "react-apollo";
import { Link } from "react-router-dom"
import { getCronFrequency, getReadableCronDescriptor } from "../../utilities/utilities"
import "../../scss/components/shared/SnapshotForm.scss";

const SCHEDULES = [
  {
    value: "hourly",
    label: "Hourly",
  },
  {
    value: "daily",
    label: "Daily",
  },
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "custom",
    label: "Custom",
  }
];

const RETENTION_UNITS = [
  {
    value: "seconds",
    label: "Seconds",
  },
  {
    value: "minutes",
    label: "Minutes",
  },
  {
    value: "hours",
    label: "Hours",
  },
  {
    value: "days",
    label: "Days",
  },
  {
    value: "weeks",
    label: "Weeks",
  },
  {
    value: "months",
    label: "Months",
  },
  {
    value: "year",
    label: "Years",
  }
];

export default class AppSnapshotSchedule extends Component {
  state = {
    retentionPolicy: "4",
    autoEnabled: false,
    selectedSchedule: {
      value: "weekly",
      label: "Weekly",
    },
    selectedRetentionUnit: {
      value: "weeks",
      label: "Weeks",
    },
    frequency: "0 0 12 ? * MON *",
  };

  handleFormChange = (field, e) => {
    let nextState = {};
    if (field === "autoEnabled") {
      nextState[field] = e.target.checked;
    } else {
      nextState[field] = e.target.value;
    }
    this.setState(nextState, () => {
      if (field === "frequency") {
        this.getReadableCronExpression();
      }
    });
  }

  getReadableCronExpression = () => {
    const { frequency } = this.state;
    try {
      const readable = getReadableCronDescriptor(frequency);
      if (readable.includes("undefined")) {
        this.setState({ hasValidCron: false });
      } else {
        this.setState({ humanReadableCron: readable, hasValidCron: true });
      }
    } catch {
      this.setState({ hasValidCron: false });
    }
  }

  handleScheduleChange = (selectedSchedule) => {
    const frequency = getCronFrequency(selectedSchedule.value);
    this.setState({
      selectedSchedule: selectedSchedule.value,
      frequency
    }, () => {
      this.getReadableCronExpression();
    });
  }

  handleRetentionUnitChange = (retentionUnit) => {
    this.setState({ selectedRetentionUnit: retentionUnit });
  }

  componentDidMount = () => {
    this.getReadableCronExpression();
  }

  render() {
    const { app } = this.props;
    const { hasValidCron } = this.state;
    const selectedRetentionUnit = RETENTION_UNITS.find((ru) => {
      return ru.value === this.state.selectedRetentionUnit.value;
    });
    const selectedSchedule = SCHEDULES.find((schedule) => {
      return schedule.value === this.state.selectedSchedule.value;
    });
    return (
      <div className="container flex-column flex1 u-overflow--auto u-paddingTop--30 u-paddingBottom--20 alignItems--center">
        <div className="snapshot-form-wrapper">
          <p className="u-marginBottom--30 u-fontSize--small u-color--tundora u-fontWeight--medium">
            <Link to={`/app/${app?.slug}/snapshots`} className="replicated-link">Snapshots</Link>
            <span className="u-color--dustyGray"> > </span>
            Schedule
          </p>
          <form>
            <div className="flex-column u-marginBottom--20">
              <div className="flex1 u-marginBottom--30">
                <p className="u-fontSize--normal u-color--tuna u-fontWeight--bold u-lineHeight--normal u-marginBottom--10">Automatic snapshots</p>
                <div className="BoxedCheckbox-wrapper flex1 u-textAlign--left">
                  <div className={`BoxedCheckbox flex-auto flex alignItems--center ${this.state.autoEnabled ? "is-active" : ""}`}>
                    <input
                      type="checkbox"
                      className="u-cursor--pointer u-marginLeft--10"
                      id="autoEnabled"
                      checked={this.state.autoEnabled}
                      onChange={(e) => { this.handleFormChange("autoEnabled", e) }}
                    />
                    <label htmlFor="autoEnabled" className="flex1 flex u-width--full u-position--relative u-cursor--pointer u-userSelect--none">
                      <div className="flex1">
                        <p className="u-color--tuna u-fontSize--normal u-fontWeight--medium">Enable automatic scheduled snapshots</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              {this.state.autoEnabled &&
                <div className="flex-column flex1 u-position--relative u-marginBottom--50">
                  <div className="flex flex1">
                    <div className="flex1 u-paddingRight--5">
                      <p className="u-fontSize--normal u-color--tuna u-fontWeight--bold u-lineHeight--normal u-marginBottom--10">Schedule</p>
                      <Select
                        className="replicated-select-container"
                        classNamePrefix="replicated-select"
                        placeholder="Select an interval"
                        options={SCHEDULES}
                        isSearchable={false}
                        getOptionValue={(schedule) => schedule.label}
                        value={selectedSchedule}
                        onChange={this.handleScheduleChange}
                        isOptionSelected={(option) => { option.value === selectedSchedule }}
                      />
                    </div>
                    {this.state.selectedSchedule === "custom" &&
                      <div className="flex1 u-paddingLeft--5">
                        <p className="u-fontSize--normal u-color--tuna u-fontWeight--bold u-lineHeight--normal u-marginBottom--10">Cron expression</p>
                        <input type="text" className="Input" placeholder="0 0 12 ? * MON *" value={this.state.frequency} onChange={(e) => { this.handleFormChange("frequency", e) }}/>
                      </div>
                    }
                  </div>
                  {hasValidCron ?
                    <p className="cron-expression-text">{this.state.humanReadableCron}</p>
                  :
                    <p className="cron-expression-text">Enter a valid Cron Expression <a className="replicated-link" href="" target="_blank" rel="noopener noreferrer">Get help</a></p>
                  }
                </div>
              }
              <div>
                <p className="u-fontSize--normal u-color--tuna u-fontWeight--bold u-lineHeight--normal u-marginBottom--10">Retention policy</p>
                <p className="u-fontSize--small u-color--dustyGray u-fontWeight--normal u-lineHeight--normal u-marginBottom--10">The Admin Console can reclaim space by automatically deleting older scheduled snapshots.</p>
                <p className="u-fontSize--small u-color--dustyGray u-fontWeight--normal u-lineHeight--normal u-marginBottom--10">Snapshots older than this will be deleted.</p>
                <div className="flex u-marginBottom--20">
                  <div className="flex-auto u-paddingRight--5">
                    <input type="text" className="Input" placeholder="4" value={this.state.retentionPolicy} onChange={(e) => { this.handleFormChange("retentionPolicy", e) }}/>
                  </div>
                  <div className="flex1 u-paddingLeft--5">
                    <Select
                      className="replicated-select-container"
                      classNamePrefix="replicated-select"
                      placeholder="Select unit"
                      options={RETENTION_UNITS}
                      isSearchable={false}
                      getOptionValue={(retentionUnit) => retentionUnit.label}
                      value={selectedRetentionUnit}
                      onChange={this.handleRetentionUnitChange}
                      isOptionSelected={(option) => { option.value === selectedRetentionUnit }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

// export default compose(
//   withApollo,
//   graphql(testGitOpsConnection, {
//     props: ({ mutate }) => ({
//       testGitOpsConnection: (appId, clusterId) => mutate({ variables: { appId, clusterId } })
//     })
//   }),
//   graphql(updateAppGitOps, {
//     props: ({ mutate }) => ({
//       updateAppGitOps: (appId, clusterId, gitOpsInput) => mutate({ variables: { appId, clusterId, gitOpsInput } })
//     })
//   }),
// )(AppSnapshots);
