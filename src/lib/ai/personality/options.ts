// ===========================================
// AI PERSONALITY WIZARD OPTIONS
// ===========================================

// Step 1: Identity & Appearance
export const BODY_TYPES = [
  { id: 'petite', label: 'Petite', icon: '🌸' },
  { id: 'slim', label: 'Slim', icon: '✨' },
  { id: 'athletic', label: 'Athletic', icon: '💪' },
  { id: 'curvy', label: 'Curvy', icon: '🔥' },
  { id: 'tall', label: 'Tall & Statuesque', icon: '👑' },
];

export const HAIR_COLORS = [
  'Blonde', 'Brunette', 'Black', 'Red', 'Auburn',
  'Platinum', 'Pink', 'Purple', 'Blue', 'Ombre'
];

export const HAIR_STYLES = [
  'Long & straight', 'Long & wavy', 'Long & curly',
  'Medium length', 'Short & sassy', 'Pixie cut',
  'Bob', 'Braids', 'Ponytail', 'Messy bun'
];

export const EYE_COLORS = [
  'Brown', 'Blue', 'Green', 'Hazel', 'Grey',
  'Amber', 'Violet', 'Heterochromia'
];

export const SKIN_TONES = [
  { id: 'fair', label: 'Fair', color: '#FDEBD0' },
  { id: 'olive', label: 'Olive', color: '#D4AC6E' },
  { id: 'tan', label: 'Tan', color: '#C68642' },
  { id: 'deep', label: 'Deep', color: '#8D5524' },
];

export const STYLE_VIBES = [
  'Gothic', 'Elegant', 'Sporty', 'Glam', 'Bohemian',
  'Edgy', 'Cute', 'Sophisticated', 'Casual', 'Vintage',
  'Alternative', 'Preppy', 'Streetwear', 'Minimalist', 'Sexy'
];

// Step 2: Personality Core
export const PERSONALITY_TRAITS = [
  { id: 'flirty', label: 'Flirty', icon: '😘' },
  { id: 'sweet', label: 'Sweet', icon: '🥰' },
  { id: 'sassy', label: 'Sassy', icon: '💅' },
  { id: 'confident', label: 'Confident', icon: '👑' },
  { id: 'shy', label: 'Shy', icon: '🙈' },
  { id: 'mysterious', label: 'Mysterious', icon: '🌙' },
  { id: 'playful', label: 'Playful', icon: '😜' },
  { id: 'intense', label: 'Intense', icon: '🔥' },
  { id: 'nurturing', label: 'Nurturing', icon: '💕' },
  { id: 'wild', label: 'Wild', icon: '🐆' },
  { id: 'intellectual', label: 'Intellectual', icon: '📚' },
  { id: 'goofy', label: 'Goofy', icon: '🤪' },
  { id: 'romantic', label: 'Romantic', icon: '💘' },
  { id: 'dominant', label: 'Dominant', icon: '⛓️' },
  { id: 'submissive', label: 'Submissive', icon: '🎀' },
  { id: 'caring', label: 'Caring', icon: '💗' },
];

export const HUMOR_STYLES = [
  { id: 'witty', label: 'Witty & Clever', description: 'Quick comebacks, wordplay' },
  { id: 'sarcastic', label: 'Sarcastic', description: 'Dry, ironic humor' },
  { id: 'silly', label: 'Silly & Goofy', description: 'Playful, childlike fun' },
  { id: 'dry', label: 'Dry & Deadpan', description: 'Understated, subtle' },
  { id: 'dirty', label: 'Dirty Jokes', description: 'Suggestive, naughty humor' },
];

export const INTELLIGENCE_VIBES = [
  { id: 'street_smart', label: 'Street Smart', description: 'Knows how the world works' },
  { id: 'book_smart', label: 'Book Smart', description: 'Educated, knowledgeable' },
  { id: 'ditzy_cute', label: 'Ditzy Cute', description: 'Adorably clueless sometimes' },
  { id: 'wise', label: 'Wise Soul', description: 'Deep, thoughtful, insightful' },
];

export const MOODS = [
  { id: 'happy', label: 'Usually Happy', description: 'Upbeat, positive energy' },
  { id: 'moody_complex', label: 'Moody & Complex', description: 'Emotional depth, unpredictable' },
  { id: 'calm_zen', label: 'Calm & Zen', description: 'Peaceful, centered energy' },
];

// Step 3: Background & Interests
export const OCCUPATIONS = [
  'Model', 'Artist', 'Student', 'Gamer', 'Musician',
  'Dancer', 'Photographer', 'Fitness Trainer', 'Bartender',
  'DJ', 'Writer', 'Fashion Designer', 'Influencer',
  'Yoga Instructor', 'Makeup Artist', 'Mystery 🤫'
];

export const INTERESTS = [
  'Fashion', 'Music', 'Gaming', 'Fitness', 'Art',
  'Travel', 'Cooking', 'Reading', 'Astrology', 'Photography',
  'Dancing', 'Movies', 'Anime', 'Nature', 'Meditation',
  'Shopping', 'Nightlife', 'Beach', 'Tattoos', 'Makeup',
  'Wine', 'Coffee', 'True Crime', 'Reality TV', 'Yoga'
];

export const MUSIC_TASTES = [
  'Pop', 'R&B', 'Indie', 'Electronic', 'Hip-Hop',
  'Rock', 'Jazz', 'Classical', 'Latin', 'K-Pop',
  'Country', 'Metal', 'Lo-fi', 'Reggaeton', 'Alternative'
];

// Step 4: Romantic & Intimate Style
export const FLIRTING_STYLES = [
  { id: 'playful_tease', label: 'Playful Tease', description: 'Fun, lighthearted flirting', icon: '😜' },
  { id: 'sweet_romantic', label: 'Sweet & Romantic', description: 'Tender, heartfelt connection', icon: '💕' },
  { id: 'intense_direct', label: 'Intense & Direct', description: 'Knows what she wants', icon: '🔥' },
  { id: 'slow_burn', label: 'Slow Burn', description: 'Builds tension over time', icon: '🌡️' },
  { id: 'bold_confident', label: 'Bold & Confident', description: 'Takes the lead', icon: '👑' },
];

export const DYNAMICS = [
  { id: 'submissive', label: 'Submissive', description: 'Likes to be led', icon: '🎀' },
  { id: 'switch', label: 'Switch', description: 'Goes both ways', icon: '🔄' },
  { id: 'dominant', label: 'Dominant', description: 'Takes control', icon: '⛓️' },
];

export const ATTRACTED_TO = [
  'Confidence', 'Humor', 'Intelligence', 'Boldness',
  'Sweetness', 'Mystery', 'Directness', 'Ambition',
  'Creativity', 'Strength', 'Sensitivity', 'Wit',
  'Dominance', 'Vulnerability', 'Passion', 'Loyalty'
];

export const LOVE_LANGUAGES = [
  { id: 'words', label: 'Words of Affirmation', description: 'Loves compliments and sweet talk', icon: '💬' },
  { id: 'attention', label: 'Quality Time', description: 'Wants your full attention', icon: '👁️' },
  { id: 'affection', label: 'Physical Affection', description: 'Craves closeness and touch', icon: '🤗' },
  { id: 'devotion', label: 'Acts of Devotion', description: 'Wants to be shown, not told', icon: '💝' },
];

export const VIBES_CREATES = [
  { id: 'romantic_fantasy', label: 'Romantic Fantasy', description: 'Like a love story', icon: '💘' },
  { id: 'playful_fun', label: 'Playful Fun', description: 'Light, exciting, fun', icon: '🎉' },
  { id: 'intense_passion', label: 'Intense Passion', description: 'Deep, consuming desire', icon: '🔥' },
  { id: 'mysterious_allure', label: 'Mysterious Allure', description: 'Intriguing, magnetic', icon: '🌙' },
  { id: 'comfort_warmth', label: 'Comfort & Warmth', description: 'Safe, cozy, caring', icon: '🤍' },
];

// Compliant "turn-ons" - vibes not explicit acts
export const TURN_ONS = [
  { id: 'control', label: 'When someone takes control', icon: '👑' },
  { id: 'admired', label: 'Being admired and wanted', icon: '😍' },
  { id: 'teasing', label: 'Playful teasing back and forth', icon: '😏' },
  { id: 'emotional', label: 'Deep emotional connection', icon: '💕' },
  { id: 'confidence', label: 'Confidence and directness', icon: '💪' },
  { id: 'pursued', label: 'Being pursued', icon: '🎯' },
  { id: 'danger', label: 'A little bit of danger', icon: '🔥' },
  { id: 'tender', label: 'Sweet and tender moments', icon: '🥰' },
  { id: 'anticipation', label: 'Anticipation and buildup', icon: '⏳' },
  { id: 'words', label: 'Hearing how much they want me', icon: '💬' },
  { id: 'submission', label: 'Being told what to do', icon: '🎀' },
  { id: 'dominance', label: 'Taking charge', icon: '⛓️' },
];

// Step 5: Voice & Speech
export const SPEECH_PATTERNS = [
  { id: 'slang', label: 'Uses slang', example: '"omg", "lowkey", "vibe"' },
  { id: 'proper', label: 'Proper grammar', example: 'Well-structured sentences' },
  { id: 'trailing', label: 'Trails off...', example: '"I was thinking..."' },
  { id: 'questions', label: 'Asks lots of questions', example: '"What do you think?"' },
  { id: 'pet_names', label: 'Uses pet names', example: '"baby", "hun", "babe"' },
  { id: 'exclamations', label: 'Excitable!', example: '"Oh my god!", "Yesss!"' },
  { id: 'lowercase', label: 'types in lowercase', example: '"hey babe whats up"' },
  { id: 'dramatic', label: 'Dramatic flair', example: '"I literally CANNOT"' },
];

export const ACCENT_FLAVORS = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'valley', label: 'Valley Girl' },
  { id: 'southern', label: 'Southern Charm' },
  { id: 'british', label: 'British Posh' },
  { id: 'latina', label: 'Latina Spice' },
  { id: 'french', label: 'French Allure' },
  { id: 'new_york', label: 'New York Sass' },
  { id: 'california', label: 'Cali Chill' },
];

// Step 6: Conversation Behavior
export const TOPICS_LOVES = [
  'Dreams & ambitions', 'Music & concerts', 'Flirting & romance',
  'Deep conversations', 'Silly random stuff', 'Compliments',
  'Travel adventures', 'Fashion & style', 'Movies & shows',
  'Fantasies', 'Their day', 'Relationship talk', 'Future plans'
];

export const TOPICS_AVOIDS = [
  'Politics', 'Religion', 'Other girls', 'Negative stuff',
  'Past relationships', 'Drama', 'Boring topics', 'Work stress'
];

export const WHEN_COMPLIMENTED = [
  { id: 'gets_shy', label: 'Gets Shy', description: '"Stopppp you\'re making me blush 🙈"', icon: '🙈' },
  { id: 'flirts_back', label: 'Flirts Back Harder', description: '"Well you\'re not so bad yourself 😏"', icon: '😏' },
  { id: 'playfully_deflects', label: 'Playfully Deflects', description: '"Oh this old thing? 💁‍♀️"', icon: '💁‍♀️' },
  { id: 'owns_it', label: 'Owns It', description: '"I know 😌💅"', icon: '💅' },
];

export const WHEN_HEATED = [
  { id: 'leans_in', label: 'Leans In', description: 'Matches the energy, teases more', icon: '🔥' },
  { id: 'slows_down', label: 'Slows It Down', description: 'Builds anticipation, makes them wait', icon: '⏳' },
  { id: 'matches_energy', label: 'Matches Energy', description: 'Goes with the flow', icon: '🌊' },
  { id: 'gets_flustered', label: 'Gets Flustered', description: 'Adorably overwhelmed', icon: '😳' },
];
