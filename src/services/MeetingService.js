const crypto = require('crypto');

/**
 * Meeting Service - Generates video meeting links
 * Uses Jitsi Meet (free, open-source, no authentication required)
 */
class MeetingService {
  /**
   * Generate a unique Jitsi Meet link for a meeting
   * @param {Object} meetingData
   * @param {string} meetingData.investorName - Investor name
   * @param {string} meetingData.userName - User name
   * @param {string} meetingData.meetingDate - Meeting date (YYYY-MM-DD)
   * @param {string} meetingData.meetingTime - Meeting time (HH:MM:SS)
   * @param {number} meetingData.meetingId - Meeting request ID
   * @returns {Object} - { success: true, meetLink: "https://meet.jit.si/..." }
   */
  generateMeetingLink(meetingData) {
    try {
      const {
        investorName = 'Investor',
        userName = 'User',
        meetingDate = '',
        meetingTime = '',
        meetingId = 0
      } = meetingData;

      // Create a unique, readable room name
      // Format: AlphaLinkup-Investor-User-Date-UniqueID
      const cleanInvestorName = this.cleanName(investorName);
      const cleanUserName = this.cleanName(userName);
      const dateStr = meetingDate.replace(/-/g, ''); // 20251110
      const timeStr = meetingTime.split(':')[0] + meetingTime.split(':')[1]; // 1430
      
      // Generate unique ID based on meeting details
      const uniqueId = this.generateUniqueId(meetingId, meetingDate, meetingTime);
      
      // Create room name (Jitsi Meet format: no spaces, alphanumeric + hyphens)
      const roomName = `AlphaLinkup-${cleanInvestorName}-${cleanUserName}-${dateStr}-${uniqueId}`;
      
      // Jitsi Meet URL
      const meetLink = `https://meet.jit.si/${roomName}`;
      
      console.log(`✅ Jitsi Meet link generated: ${meetLink}`);
      
      return {
        success: true,
        meetLink: meetLink,
        roomName: roomName,
        provider: 'Jitsi Meet'
      };
    } catch (error) {
      console.error('Error generating meeting link:', error.message);
      return {
        success: false,
        error: error.message,
        meetLink: null
      };
    }
  }

  /**
   * Clean name for URL (remove special chars, spaces, etc.)
   * @param {string} name
   * @returns {string}
   */
  cleanName(name) {
    if (!name) return 'Guest';
    
    return name
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .substring(0, 20)               // Limit length
      .replace(/-+$/, '');            // Remove trailing hyphens
  }

  /**
   * Generate a short unique ID based on meeting details
   * @param {number} meetingId
   * @param {string} meetingDate
   * @param {string} meetingTime
   * @returns {string}
   */
  generateUniqueId(meetingId, meetingDate, meetingTime) {
    // Combine meeting details for uniqueness
    const data = `${meetingId}-${meetingDate}-${meetingTime}-${Date.now()}`;
    
    // Generate short hash (8 characters)
    const hash = crypto
      .createHash('md5')
      .update(data)
      .digest('hex')
      .substring(0, 8);
    
    return hash;
  }

  /**
   * Parse a meeting link to extract room name
   * @param {string} meetLink
   * @returns {string|null}
   */
  extractRoomName(meetLink) {
    try {
      if (!meetLink || !meetLink.includes('meet.jit.si')) {
        return null;
      }
      
      const parts = meetLink.split('/');
      return parts[parts.length - 1];
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a meeting link is valid
   * @param {string} meetLink
   * @returns {boolean}
   */
  isValidMeetingLink(meetLink) {
    if (!meetLink) return false;
    
    return meetLink.startsWith('https://meet.jit.si/') && 
           meetLink.length > 'https://meet.jit.si/'.length;
  }
}

// Export singleton instance
module.exports = new MeetingService();


