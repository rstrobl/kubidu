"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildStatus = exports.SubscriptionStatus = exports.SubscriptionPlan = exports.DeploymentStatus = exports.RepositoryProvider = exports.ServiceStatus = exports.ServiceType = exports.ProjectStatus = exports.ApiKeyPermission = exports.UserStatus = void 0;
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["DELETED"] = "DELETED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var ApiKeyPermission;
(function (ApiKeyPermission) {
    ApiKeyPermission["READ"] = "read";
    ApiKeyPermission["WRITE"] = "write";
    ApiKeyPermission["ADMIN"] = "admin";
})(ApiKeyPermission || (exports.ApiKeyPermission = ApiKeyPermission = {}));
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["ACTIVE"] = "ACTIVE";
    ProjectStatus["ARCHIVED"] = "ARCHIVED";
    ProjectStatus["DELETED"] = "DELETED";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["GITHUB"] = "GITHUB";
    ServiceType["DOCKER_IMAGE"] = "DOCKER_IMAGE";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["ACTIVE"] = "ACTIVE";
    ServiceStatus["INACTIVE"] = "INACTIVE";
    ServiceStatus["DELETED"] = "DELETED";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
var RepositoryProvider;
(function (RepositoryProvider) {
    RepositoryProvider["GITHUB"] = "github";
    RepositoryProvider["GITLAB"] = "gitlab";
    RepositoryProvider["BITBUCKET"] = "bitbucket";
})(RepositoryProvider || (exports.RepositoryProvider = RepositoryProvider = {}));
var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["PENDING"] = "PENDING";
    DeploymentStatus["BUILDING"] = "BUILDING";
    DeploymentStatus["DEPLOYING"] = "DEPLOYING";
    DeploymentStatus["RUNNING"] = "RUNNING";
    DeploymentStatus["STOPPED"] = "STOPPED";
    DeploymentStatus["FAILED"] = "FAILED";
    DeploymentStatus["CRASHED"] = "CRASHED";
})(DeploymentStatus || (exports.DeploymentStatus = DeploymentStatus = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "FREE";
    SubscriptionPlan["STARTER"] = "STARTER";
    SubscriptionPlan["PRO"] = "PRO";
    SubscriptionPlan["ENTERPRISE"] = "ENTERPRISE";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["CANCELED"] = "CANCELED";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["TRIALING"] = "TRIALING";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var BuildStatus;
(function (BuildStatus) {
    BuildStatus["QUEUED"] = "QUEUED";
    BuildStatus["BUILDING"] = "BUILDING";
    BuildStatus["COMPLETED"] = "COMPLETED";
    BuildStatus["FAILED"] = "FAILED";
})(BuildStatus || (exports.BuildStatus = BuildStatus = {}));
//# sourceMappingURL=index.js.map