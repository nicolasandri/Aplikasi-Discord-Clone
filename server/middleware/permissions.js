const { permissionDB, Permissions } = require('../database');

/**
 * Permission middleware factory
 * Returns middleware that checks if user has specific permission
 * @param {number} permission - Permission bitfield to check
 * @returns {Function} Express middleware
 */
function checkPermission(permission) {
  return async (req, res, next) => {
    try {
      const userId = req.userId; // Set by authenticateToken middleware
      const serverId = req.params.serverId || req.params.id || req.body.serverId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!serverId) {
        // For endpoints without server context (like direct messages)
        return next();
      }

      // Check if user has the required permission
      const hasPerm = await permissionDB.hasPermission(userId, serverId, permission);
      
      if (!hasPerm) {
        return res.status(403).json({ 
          error: 'Forbidden: You do not have permission to perform this action' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Check if user has any of the specified permissions
 * @param {number[]} permissions - Array of permission bitfields
 */
function checkAnyPermission(permissions) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const serverId = req.params.serverId || req.params.id || req.body.serverId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!serverId) {
        return next();
      }

      const userPerms = await permissionDB.getUserPermissions(userId, serverId);
      
      const hasAnyPerm = permissions.some(perm => (userPerms & perm) === perm);
      
      if (!hasAnyPerm) {
        return res.status(403).json({ 
          error: 'Forbidden: You do not have permission to perform this action' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Check if user is server owner
 */
function requireServerOwner(req, res, next) {
  const userId = req.userId;
  const serverId = req.params.serverId || req.params.id;

  if (!userId || !serverId) {
    return res.status(400).json({ error: 'Bad request' });
  }

  permissionDB.isServerOwner(userId, serverId)
    .then(isOwner => {
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: Server owner only' });
      }
      next();
    })
    .catch(error => {
      console.error('Owner check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
}

/**
 * Check if user can manage another user
 */
function canManageMember(req, res, next) {
  const managerId = req.userId;
  const targetId = req.params.userId;
  const serverId = req.params.serverId;

  if (!managerId || !targetId || !serverId) {
    return res.status(400).json({ error: 'Bad request' });
  }

  permissionDB.canManageUser(managerId, targetId, serverId)
    .then(canManage => {
      if (!canManage) {
        return res.status(403).json({ 
          error: 'Forbidden: You cannot manage this user' 
        });
      }
      next();
    })
    .catch(error => {
      console.error('Can manage check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
}

/**
 * Middleware to fetch user's permissions and attach to request
 */
async function fetchPermissions(req, res, next) {
  try {
    const userId = req.userId;
    const serverId = req.params.serverId || req.params.id;

    if (userId && serverId) {
      req.userPermissions = await permissionDB.getUserPermissions(userId, serverId);
      req.userRole = await permissionDB.getUserRole(userId, serverId);
      req.isOwner = await permissionDB.isServerOwner(userId, serverId);
    }

    next();
  } catch (error) {
    console.error('Fetch permissions error:', error);
    next();
  }
}

module.exports = {
  checkPermission,
  checkAnyPermission,
  requireServerOwner,
  canManageMember,
  fetchPermissions,
  Permissions
};
