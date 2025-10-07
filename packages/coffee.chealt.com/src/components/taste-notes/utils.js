import coffeeTasteNotes from '../../../data/coffeeTasteNotes.json';
import tasteNoteGroups from '../../../data/tasteNoteGroups.json';
import tasteNoteSubGroups from '../../../data/tasteNoteSubGroups.json';
import tasteNotes from '../../../data/tasteNotes.json';

const getTasteNoteGroup = (coffeeId) => {
  const tasteNoteId = coffeeTasteNotes.find((coffeeTasteNote) => coffeeTasteNote.coffee_id === coffeeId)?.taste_note_id;
  const tasteNote = tasteNotes.find(({ taste_note_id: id }) => id === tasteNoteId);
  const tasteNoteSubGroup =
    tasteNote && tasteNoteSubGroups.find(({ taste_note_sub_group_id: id }) => id === tasteNote.taste_note_sub_group_id);
  const tasteNoteGroup =
    tasteNoteSubGroup &&
    tasteNoteGroups.find(({ taste_note_group_id: id }) => id === tasteNoteSubGroup.taste_note_group_id);

  return tasteNoteGroup || undefined;
};

const getTasteNoteGroupByNoteId = (tasteNoteId) => {
  const tasteNote = tasteNotes.find(({ taste_note_id: id }) => id === tasteNoteId);
  const tasteNoteSubGroup =
    tasteNote && tasteNoteSubGroups.find(({ taste_note_sub_group_id: id }) => id === tasteNote.taste_note_sub_group_id);
  const tasteNoteGroup =
    tasteNoteSubGroup &&
    tasteNoteGroups.find(({ taste_note_group_id: id }) => id === tasteNoteSubGroup.taste_note_group_id);

  return tasteNoteGroup || undefined;
};

export { getTasteNoteGroup, getTasteNoteGroupByNoteId };
