const config = require('../config.js');

class PermissionManager {
    static hasRole(member, roleId) {
        return member.roles.cache.has(roleId);
    }

    static isStaff(member) {
        return this.hasRole(member, config.roles.staff) || 
               this.hasRole(member, config.roles.moderator) || 
               this.hasRole(member, config.roles.admin) ||
               member.permissions.has('Administrator');
    }

    static isModerator(member) {
        return this.hasRole(member, config.roles.moderator) || 
               this.hasRole(member, config.roles.admin) ||
               member.permissions.has('Administrator');
    }

    static isAdmin(member) {
        return this.hasRole(member, config.roles.admin) ||
               member.permissions.has('Administrator');
    }

    static canManageTickets(member) {
        return this.isStaff(member) || 
               config.tickets.supportRoles.some(roleId => this.hasRole(member, roleId));
    }

    static canModerate(member) {
        return this.isModerator(member);
    }

    static canManageSuggestions(member) {
        return this.isStaff(member);
    }

    static hasPermission(member, permission) {
        switch (permission) {
            case 'staff':
                return this.isStaff(member);
            case 'moderator':
                return this.isModerator(member);
            case 'admin':
                return this.isAdmin(member);
            case 'tickets':
                return this.canManageTickets(member);
            case 'moderation':
                return this.canModerate(member);
            case 'suggestions':
                return this.canManageSuggestions(member);
            default:
                return false;
        }
    }

    static getHighestRole(member) {
        if (this.isAdmin(member)) return 'admin';
        if (this.isModerator(member)) return 'moderator';
        if (this.isStaff(member)) return 'staff';
        return 'member';
    }
}

module.exports = PermissionManager;
