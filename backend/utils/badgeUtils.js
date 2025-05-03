const User = require('../Models/Users'); // Fixed import to match your schema file
const Post = require('../Models/Post');

// Define badges with priority levels (higher number = higher priority)
const badges = [
  { name: 'Membre Actif', description: 'A posté 5 commentaires', condition: (stats) => stats.comments >= 5, priority: 1 },
  { name: 'Écoute Active', description: 'A liké 10 posts', condition: (stats) => stats.likes >= 4, priority: 2 },
  { name: 'Soutien Exemplaire', description: 'A publié 3 posts', condition: (stats) => stats.posts >= 3, priority: 3 },
  { name: 'Engagé Réactif', description: 'A liké 5 commentaires', condition: (stats) => stats.commentLikes >= 5, priority: 4 },
];

const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { user, newBadge: null };

    // Calculate user stats
    const stats = {
      comments: await Post.aggregate([
        { $unwind: '$comments' },
        { $match: { 'comments.author': user._id } },
        { $count: 'comments' }
      ]).then(result => result[0]?.comments || 0),

      likes: await Post.countDocuments({ likes: user._id }),

      posts: await Post.countDocuments({ author: user._id }),

      // Count likes on comments by this user
      commentLikes: await Post.aggregate([
        { $unwind: '$comments' },
        { $match: { 'comments.likes': user._id } },
        { $count: 'commentLikes' }
      ]).then(result => result[0]?.commentLikes || 0),
    };

    let newBadge = null;

    // Find the highest priority badge the user qualifies for
    let highestPriorityBadge = null;
    for (const badge of badges) {
      if (badge.condition(stats)) {
        if (!highestPriorityBadge || badge.priority > highestPriorityBadge.priority) {
          highestPriorityBadge = badge;
        }
      }
    }

    // If a badge is earned and it has a higher priority than the existing badge (or no badge exists)
    if (highestPriorityBadge) {
      const currentBadge = user.badges.length > 0 ? user.badges[0] : null;
      const currentBadgePriority = currentBadge
        ? badges.find(b => b.name === currentBadge.name)?.priority || 0
        : 0;

      if (!currentBadge || highestPriorityBadge.priority > currentBadgePriority) {
        // Replace the existing badge (if any) with the new one
        user.badges = [{
          name: highestPriorityBadge.name,
          description: highestPriorityBadge.description,
          awardedAt: new Date(),
        }];
        newBadge = highestPriorityBadge; // Track the new badge to return
      }
    }

    await user.save();
    return { user, newBadge }; // Return user and any newly awarded badge
  } catch (error) {
    console.error('Erreur lors de l\'attribution des badges:', error);
    return { user: null, newBadge: null };
  }
};

module.exports = { checkAndAwardBadges };