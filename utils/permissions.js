const config = require('../config.js');

class PermissionManager {
    static hasRole(member, roleId) {
        // Handle both User and GuildMember objects
        if (!member || !member.roles || !member.roles.cache) {
            return false;
        }
        return member.roles.cache.has(roleId);
    }

    static isStaff(member) {
        // Handle both User and GuildMember objects
        if (!member) return false;

        // If it's a User object, we can't check roles
        if (!member.roles || !member.roles.cache) {
            return false;
        }

        return this.hasRole(member, config.roles.staff) ||
               this.hasRole(member, config.roles.moderator) ||
               this.hasRole(member, config.roles.admin) ||
               (member.permissions && member.permissions.has('Administrator'));
    }

    static isModerator(member) {
        // Handle both User and GuildMember objects
        if (!member) return false;

        // If it's a User object, we can't check roles
        if (!member.roles || !member.roles.cache) {
            return false;
        }

        return this.hasRole(member, config.roles.moderator) ||
               this.hasRole(member, config.roles.admin) ||
               (member.permissions && member.permissions.has('Administrator'));
    }

    static isAdmin(member) {
        // Handle both User and GuildMember objects
        if (!member) return false;

        // If it's a User object, we can't check roles
        if (!member.roles || !member.roles.cache) {
            return false;
        }

        return this.hasRole(member, config.roles.admin) ||
               (member.permissions && member.permissions.has('Administrator'));
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
