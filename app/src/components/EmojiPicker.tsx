import { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

// Common emojis that work on all platforms
const EMOJI_LIST = [
  { emoji: '😀', name: 'grinning' },
  { emoji: '😃', name: 'smiley' },
  { emoji: '😄', name: 'smile' },
  { emoji: '😁', name: 'grin' },
  { emoji: '😆', name: 'laughing' },
  { emoji: '😅', name: 'sweat_smile' },
  { emoji: '🤣', name: 'rofl' },
  { emoji: '😂', name: 'joy' },
  { emoji: '🙂', name: 'slightly_smiling' },
  { emoji: '🙃', name: 'upside_down' },
  { emoji: '😉', name: 'wink' },
  { emoji: '😊', name: 'blush' },
  { emoji: '😇', name: 'innocent' },
  { emoji: '🥰', name: 'smiling_face_with_hearts' },
  { emoji: '😍', name: 'heart_eyes' },
  { emoji: '🤩', name: 'star_struck' },
  { emoji: '😘', name: 'kissing_heart' },
  { emoji: '😗', name: 'kissing' },
  { emoji: '☺️', name: 'relaxed' },
  { emoji: '😚', name: 'kissing_closed_eyes' },
  { emoji: '😙', name: 'kissing_smiling_eyes' },
  { emoji: '🥲', name: 'smiling_face_with_tear' },
  { emoji: '😋', name: 'yum' },
  { emoji: '😛', name: 'stuck_out_tongue' },
  { emoji: '😜', name: 'stuck_out_tongue_winking_eye' },
  { emoji: '🤪', name: 'zany_face' },
  { emoji: '😝', name: 'stuck_out_tongue_closed_eyes' },
  { emoji: '🤑', name: 'money_mouth_face' },
  { emoji: '🤗', name: 'hugs' },
  { emoji: '🤭', name: 'hand_over_mouth' },
  { emoji: '🤫', name: 'shushing_face' },
  { emoji: '🤔', name: 'thinking' },
  { emoji: '🤐', name: 'zipper_mouth_face' },
  { emoji: '🤨', name: 'raised_eyebrow' },
  { emoji: '😐', name: 'neutral_face' },
  { emoji: '😑', name: 'expressionless' },
  { emoji: '😶', name: 'no_mouth' },
  { emoji: '😏', name: 'smirk' },
  { emoji: '😒', name: 'unamused' },
  { emoji: '🙄', name: 'roll_eyes' },
  { emoji: '😬', name: 'grimacing' },
  { emoji: '🤥', name: 'lying_face' },
  { emoji: '😔', name: 'pensive' },
  { emoji: '😕', name: 'confused' },
  { emoji: '😟', name: 'worried' },
  { emoji: '🙁', name: 'slightly_frowning_face' },
  { emoji: '☹️', name: 'frowning_face' },
  { emoji: '😣', name: 'persevere' },
  { emoji: '😖', name: 'confounded' },
  { emoji: '😫', name: 'tired_face' },
  { emoji: '😩', name: 'weary' },
  { emoji: '🥺', name: 'pleading_face' },
  { emoji: '😢', name: 'cry' },
  { emoji: '😭', name: 'sob' },
  { emoji: '😤', name: 'triumph' },
  { emoji: '😠', name: 'angry' },
  { emoji: '😡', name: 'rage' },
  { emoji: '🤬', name: 'cursing_face' },
  { emoji: '🤯', name: 'exploding_head' },
  { emoji: '😳', name: 'flushed' },
  { emoji: '🥵', name: 'hot_face' },
  { emoji: '🥶', name: 'cold_face' },
  { emoji: '😱', name: 'scream' },
  { emoji: '😨', name: 'fearful' },
  { emoji: '😰', name: 'cold_sweat' },
  { emoji: '😥', name: 'disappointed_relieved' },
  { emoji: '😓', name: 'sweat' },
  { emoji: '🤗', name: 'hugging' },
  { emoji: '🤔', name: 'thinking_face' },
  { emoji: '🤭', name: 'face_with_hand_over_mouth' },
  { emoji: '🤫', name: 'shushing_face' },
  { emoji: '🤥', name: 'lying_face' },
  { emoji: '😶', name: 'face_without_mouth' },
  { emoji: '😶‍🌫️', name: 'face_in_clouds' },
  { emoji: '😐', name: 'neutral_face' },
  { emoji: '😑', name: 'expressionless_face' },
  { emoji: '😬', name: 'grimacing_face' },
  { emoji: '🙄', name: 'face_with_rolling_eyes' },
  { emoji: '😯', name: 'hushed_face' },
  { emoji: '😦', name: 'frowning_face_with_open_mouth' },
  { emoji: '😧', name: 'anguished_face' },
  { emoji: '😮', name: 'face_with_open_mouth' },
  { emoji: '😲', name: 'astonished_face' },
  { emoji: '🥱', name: 'yawning_face' },
  { emoji: '😴', name: 'sleeping_face' },
  { emoji: '🤤', name: 'drooling_face' },
  { emoji: '😪', name: 'sleepy_face' },
  { emoji: '😵', name: 'dizzy_face' },
  { emoji: '😵‍💫', name: 'face_with_spiral_eyes' },
  { emoji: '🤐', name: 'zipper_mouth_face' },
  { emoji: '🥴', name: 'woozy_face' },
  { emoji: '🤢', name: 'nauseated_face' },
  { emoji: '🤮', name: 'face_vomiting' },
  { emoji: '🤧', name: 'sneezing_face' },
  { emoji: '😷', name: 'face_with_medical_mask' },
  { emoji: '🤒', name: 'face_with_thermometer' },
  { emoji: '🤕', name: 'face_with_head_bandage' },
  { emoji: '🤠', name: 'cowboy_hat_face' },
  { emoji: '🥳', name: 'partying_face' },
  { emoji: '🥸', name: 'disguised_face' },
  { emoji: '😎', name: 'smiling_face_with_sunglasses' },
  { emoji: '🤓', name: 'nerd_face' },
  { emoji: '🧐', name: 'face_with_monocle' },
  { emoji: '😕', name: 'confused_face' },
  { emoji: '😟', name: 'worried_face' },
  { emoji: '🙁', name: 'slightly_frowning_face' },
  // Gestures & People
  { emoji: '👍', name: 'thumbs_up' },
  { emoji: '👎', name: 'thumbs_down' },
  { emoji: '👌', name: 'ok_hand' },
  { emoji: '✌️', name: 'victory_hand' },
  { emoji: '🤞', name: 'crossed_fingers' },
  { emoji: '🤟', name: 'love_you_gesture' },
  { emoji: '🤘', name: 'sign_of_the_horns' },
  { emoji: '🤙', name: 'call_me_hand' },
  { emoji: '👈', name: 'backhand_index_pointing_left' },
  { emoji: '👉', name: 'backhand_index_pointing_right' },
  { emoji: '👆', name: 'backhand_index_pointing_up' },
  { emoji: '👇', name: 'backhand_index_pointing_down' },
  { emoji: '☝️', name: 'index_pointing_up' },
  { emoji: '👋', name: 'waving_hand' },
  { emoji: '🤚', name: 'raised_back_of_hand' },
  { emoji: '🖐️', name: 'hand_with_fingers_splayed' },
  { emoji: '✋', name: 'raised_hand' },
  { emoji: '🖖', name: 'vulcan_salute' },
  { emoji: '👏', name: 'clapping_hands' },
  { emoji: '🙌', name: 'raising_hands' },
  { emoji: '👐', name: 'open_hands' },
  { emoji: '🤲', name: 'palms_up_together' },
  { emoji: '🤝', name: 'handshake' },
  { emoji: '🙏', name: 'folded_hands' },
  { emoji: '💪', name: 'flexed_biceps' },
  { emoji: '🦾', name: 'mechanical_arm' },
  { emoji: '🦿', name: 'mechanical_leg' },
  { emoji: '🦵', name: 'leg' },
  { emoji: '🦶', name: 'foot' },
  { emoji: '👂', name: 'ear' },
  { emoji: '🦻', name: 'ear_with_hearing_aid' },
  { emoji: '👃', name: 'nose' },
  { emoji: '🧠', name: 'brain' },
  { emoji: '🫀', name: 'anatomical_heart' },
  { emoji: '🫁', name: 'lungs' },
  { emoji: '🦷', name: 'tooth' },
  { emoji: '🦴', name: 'bone' },
  { emoji: '👀', name: 'eyes' },
  { emoji: '👁️', name: 'eye' },
  { emoji: '👅', name: 'tongue' },
  { emoji: '👄', name: 'mouth' },
  { emoji: '💋', name: 'kiss_mark' },
  // Hearts
  { emoji: '❤️', name: 'red_heart' },
  { emoji: '🧡', name: 'orange_heart' },
  { emoji: '💛', name: 'yellow_heart' },
  { emoji: '💚', name: 'green_heart' },
  { emoji: '💙', name: 'blue_heart' },
  { emoji: '💜', name: 'purple_heart' },
  { emoji: '🖤', name: 'black_heart' },
  { emoji: '🤍', name: 'white_heart' },
  { emoji: '🤎', name: 'brown_heart' },
  { emoji: '💔', name: 'broken_heart' },
  { emoji: '❤️‍🔥', name: 'heart_on_fire' },
  { emoji: '❤️‍🩹', name: 'mending_heart' },
  { emoji: '💕', name: 'two_hearts' },
  { emoji: '💞', name: 'revolving_hearts' },
  { emoji: '💓', name: 'beating_heart' },
  { emoji: '💗', name: 'growing_heart' },
  { emoji: '💖', name: 'sparkling_heart' },
  { emoji: '💘', name: 'heart_with_arrow' },
  { emoji: '💝', name: 'heart_with_ribbon' },
  // Food
  { emoji: '🍎', name: 'red_apple' },
  { emoji: '🍏', name: 'green_apple' },
  { emoji: '🍐', name: 'pear' },
  { emoji: '🍊', name: 'tangerine' },
  { emoji: '🍋', name: 'lemon' },
  { emoji: '🍌', name: 'banana' },
  { emoji: '🍉', name: 'watermelon' },
  { emoji: '🍇', name: 'grapes' },
  { emoji: '🍓', name: 'strawberry' },
  { emoji: '🫐', name: 'blueberries' },
  { emoji: '🍈', name: 'melon' },
  { emoji: '🍒', name: 'cherries' },
  { emoji: '🍑', name: 'peach' },
  { emoji: '🍍', name: 'pineapple' },
  { emoji: '🥝', name: 'kiwi_fruit' },
  { emoji: '🍅', name: 'tomato' },
  { emoji: '🍆', name: 'eggplant' },
  { emoji: '🥑', name: 'avocado' },
  { emoji: '🥦', name: 'broccoli' },
  { emoji: '🥬', name: 'leafy_green' },
  { emoji: '🥒', name: 'cucumber' },
  { emoji: '🌶️', name: 'hot_pepper' },
  { emoji: '🫑', name: 'bell_pepper' },
  { emoji: '🌽', name: 'ear_of_corn' },
  { emoji: '🥕', name: 'carrot' },
  { emoji: '🧄', name: 'garlic' },
  { emoji: '🧅', name: 'onion' },
  { emoji: '🥔', name: 'potato' },
  { emoji: '🍠', name: 'roasted_sweet_potato' },
  { emoji: '🥐', name: 'croissant' },
  { emoji: '🥯', name: 'bagel' },
  { emoji: '🍞', name: 'bread' },
  { emoji: '🥖', name: 'baguette_bread' },
  { emoji: '🥨', name: 'pretzel' },
  { emoji: '🧀', name: 'cheese_wedge' },
  { emoji: '🥚', name: 'egg' },
  { emoji: '🍳', name: 'cooking' },
  { emoji: '🧈', name: 'butter' },
  { emoji: '🥞', name: 'pancakes' },
  { emoji: '🧇', name: 'waffle' },
  { emoji: '🥓', name: 'bacon' },
  { emoji: '🥩', name: 'cut_of_meat' },
  { emoji: '🍗', name: 'poultry_leg' },
  { emoji: '🍖', name: 'meat_on_bone' },
  { emoji: '🌭', name: 'hot_dog' },
  { emoji: '🍔', name: 'hamburger' },
  { emoji: '🍟', name: 'french_fries' },
  { emoji: '🍕', name: 'pizza' },
  // Activities
  { emoji: '⚽', name: 'soccer_ball' },
  { emoji: '🏀', name: 'basketball' },
  { emoji: '🏈', name: 'american_football' },
  { emoji: '⚾', name: 'baseball' },
  { emoji: '🥎', name: 'softball' },
  { emoji: '🎾', name: 'tennis' },
  { emoji: '🏐', name: 'volleyball' },
  { emoji: '🏉', name: 'rugby_football' },
  { emoji: '🥏', name: 'flying_disc' },
  { emoji: '🎱', name: 'pool_8_ball' },
  { emoji: '🪀', name: 'yo_yo' },
  { emoji: '🏓', name: 'ping_pong' },
  { emoji: '🏸', name: 'badminton' },
  { emoji: '🏒', name: 'ice_hockey' },
  { emoji: '🏑', name: 'field_hockey' },
  { emoji: '🥍', name: 'lacrosse' },
  { emoji: '🏏', name: 'cricket_game' },
  { emoji: '🥅', name: 'goal_net' },
  { emoji: '⛳', name: 'flag_in_hole' },
  { emoji: '🪁', name: 'kite' },
  { emoji: '🏹', name: 'bow_and_arrow' },
  { emoji: '🎣', name: 'fishing_pole' },
  { emoji: '🤿', name: 'diving_mask' },
  { emoji: '🥊', name: 'boxing_glove' },
  { emoji: '🥋', name: 'martial_arts_uniform' },
  { emoji: '🎽', name: 'running_shirt' },
  { emoji: '🛹', name: 'skateboard' },
  { emoji: '🛼', name: 'roller_skate' },
  { emoji: '🛷', name: 'sled' },
  { emoji: '⛸️', name: 'ice_skate' },
  { emoji: '🥌', name: 'curling_stone' },
  { emoji: '🎿', name: 'skis' },
  // Objects
  { emoji: '💎', name: 'gem_stone' },
  { emoji: '🔮', name: 'crystal_ball' },
  { emoji: '🧸', name: 'teddy_bear' },
  { emoji: '🖼️', name: 'framed_picture' },
  { emoji: '🧵', name: 'thread' },
  { emoji: '🧶', name: 'yarn' },
  { emoji: '👓', name: 'glasses' },
  { emoji: '🕶️', name: 'sunglasses' },
  { emoji: '🥽', name: 'goggles' },
  { emoji: '🥼', name: 'lab_coat' },
  { emoji: '🦺', name: 'safety_vest' },
  { emoji: '👔', name: 'necktie' },
  { emoji: '👕', name: 't_shirt' },
  { emoji: '👖', name: 'jeans' },
  { emoji: '🧣', name: 'scarf' },
  { emoji: '🧤', name: 'gloves' },
  { emoji: '🧥', name: 'coat' },
  { emoji: '🧦', name: 'socks' },
  { emoji: '👗', name: 'dress' },
  { emoji: '👘', name: 'kimono' },
  { emoji: '🥻', name: 'sari' },
  { emoji: '🩱', name: 'one_piece_swimsuit' },
  { emoji: '🩲', name: 'briefs' },
  { emoji: '🩳', name: 'shorts' },
  { emoji: '👙', name: 'bikini' },
  { emoji: '👚', name: 'woman_clothes' },
  { emoji: '👛', name: 'purse' },
  { emoji: '👜', name: 'handbag' },
  { emoji: '👝', name: 'clutch_bag' },
  { emoji: '🎒', name: 'backpack' },
  { emoji: '👞', name: 'man_shoe' },
  { emoji: '👟', name: 'running_shoe' },
  { emoji: '🥾', name: 'hiking_boot' },
  { emoji: '🥿', name: 'flat_shoe' },
  { emoji: '👠', name: 'high_heeled_shoe' },
  { emoji: '👡', name: 'woman_sandal' },
  { emoji: '🩰', name: 'ballet_shoes' },
  { emoji: '👢', name: 'woman_boot' },
  { emoji: '👑', name: 'crown' },
  { emoji: '👒', name: 'woman_hat' },
  { emoji: '🎩', name: 'top_hat' },
  { emoji: '🎓', name: 'graduation_cap' },
  { emoji: '🧢', name: 'billed_cap' },
  { emoji: '📷', name: 'camera' },
  { emoji: '📸', name: 'camera_with_flash' },
  { emoji: '📹', name: 'video_camera' },
];

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsidePicker = pickerRef.current && !pickerRef.current.contains(target);
      
      if (isOutsideButton && isOutsidePicker) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
      >
        <Smile className="w-5 h-5" />
      </button>

      {isOpen && (
        <div 
          ref={pickerRef}
          className="fixed bottom-20 right-4 bg-[#2f3136] border border-[#202225] rounded-lg shadow-2xl w-[340px] h-[400px] flex flex-col z-[99999]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#202225]">
            <span className="text-white font-semibold">Emoji</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#b9bbbe] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Emoji Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_LIST.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleEmojiClick(item.emoji)}
                  className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-[#40444b] rounded transition-colors"
                  title={item.name}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
