const express = require('express');
const router = express.Router();
const Users = require('../Models/Users');
const Case = require('../Models/Case');
const SessionNote = require('../Models/Note');
const NoteTemplate = require('../Models/noteTemplateSchema');
const mongoose = require('mongoose');
const { validateToken, authorizeRoles } = require('../middleware/authentication');

// Auth middleware for psychologists
const psychologistAuth = [validateToken, authorizeRoles('psychologue', 'psychiatre')];

// Helper to check access permission - Optimized version
const checkAccess = async (psychologistId, noteId) => {
  try {
    // Vérifier que les IDs sont valides
    if (!psychologistId || !noteId) {
      return { hasAccess: false, error: 'Invalid parameters', note: null };
    }

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return { hasAccess: false, error: 'Invalid note ID format', note: null };
    }

    // Trouver la note
    const note = await SessionNote.findById(noteId);
    if (!note) {
      return { hasAccess: false, error: 'Note not found', note: null };
    }

    // Vérification sécurisée de l'ID du psychologue
    const noteOwnerId = note.psychologistId ? note.psychologistId.toString() : '';
    const requesterId = psychologistId ? psychologistId.toString() : '';
    
    if (!noteOwnerId || noteOwnerId !== requesterId) {
      return { hasAccess: false, error: 'Unauthorized access', note };
    }
    
    return { hasAccess: true, error: null, note };
  } catch (err) {
    console.error('Error in checkAccess:', err);
    return { hasAccess: false, error: 'Server error during authorization check', note: null };
  }
};

// GET all templates (predefined and custom) - ENHANCED
router.get('/templates', psychologistAuth, async (req, res) => {
  try {
    const psychologistId = req.user._id || req.user.userId;
    
    // Get global templates and those created by this psychologist
    const globalTemplates = await NoteTemplate.find({ isGlobal: true });
    const customTemplates = await NoteTemplate.find({ 
      createdBy: psychologistId, 
      isGlobal: false 
    });
    
    // Structurer la réponse pour une meilleure UX
    const response = {
      global: globalTemplates,
      custom: customTemplates,
      // Regrouper par type pour faciliter l'organisation dans l'UI
      byType: {
        standard: [...globalTemplates, ...customTemplates].filter(t => t.type === 'standard'),
        initial_assessment: [...globalTemplates, ...customTemplates].filter(t => t.type === 'initial_assessment'),
        progress_update: [...globalTemplates, ...customTemplates].filter(t => t.type === 'progress_update'),
        crisis_intervention: [...globalTemplates, ...customTemplates].filter(t => t.type === 'crisis_intervention'),
        follow_up: [...globalTemplates, ...customTemplates].filter(t => t.type === 'follow_up') // Ajout du type follow_up

      },
      // Option pour sélection simple
      all: [...globalTemplates, ...customTemplates]
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      message: 'Error retrieving templates',
      error: error.message
    });
  }
});

// GET template by type - NEW
router.get('/templates/type/:type', psychologistAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    
    // Chercher d'abord un template personnalisé par défaut
    let template = await NoteTemplate.findOne({
      type,
      createdBy: psychologistId,
      isDefault: true
    });
    
    // Si pas de template personnalisé par défaut, chercher n'importe quel template personnalisé
    if (!template) {
      template = await NoteTemplate.findOne({
        type,
        createdBy: psychologistId
      });
    }
    
    // Si pas de template personnalisé, chercher un template global
    if (!template) {
      template = await NoteTemplate.findOne({
        type,
        isGlobal: true
      });
    }
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found for this type' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error getting template by type:', error);
    res.status(500).json({
      message: 'Error retrieving template',
      error: error.message
    });
  }
});

// GET template preview by ID - NEW
router.get('/templates/:id/preview', psychologistAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }
    
    const template = await NoteTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Générer un aperçu avec les valeurs par défaut
    const preview = {};
    Object.entries(template.structure).forEach(([field, config]) => {
      preview[field] = config.defaultValue || '';
    });
    
    res.status(200).json({
      template,
      preview,
      // Inclure les indicateurs de champs requis pour l'UI
      requiredFields: Object.entries(template.structure)
        .filter(([_, config]) => config.required)
        .map(([field]) => field)
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      message: 'Error generating template preview',
      error: error.message
    });
  }
});

// GET suggested template for a case - NEW
router.get('/case/:caseId/suggested-template', psychologistAuth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    
    // Vérifier l'accès au cas
    const caseData = await Case.findOne({
      _id: caseId,
      psychologistId
    });
    
    if (!caseData) {
      return res.status(404).json({ message: 'Case not found or unauthorized access' });
    }
    
    // Vérifier les notes existantes pour ce cas
    const existingNotes = await SessionNote.find({ 
      caseId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 });
    
    // Logique pour suggérer des templates basés sur l'historique
    let suggestedTemplateType;
    
    if (existingNotes.length === 0) {
      // Première note pour ce cas - suggérer une évaluation initiale
      suggestedTemplateType = 'initial_assessment';
    } else {
      const lastNote = existingNotes[0];
      const daysSinceLastNote = Math.floor(
        (new Date() - new Date(lastNote.createdAt)) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastNote > 14) {
        // Plus de deux semaines depuis la dernière note - suggérer une mise à jour
        suggestedTemplateType = 'progress_update';
      } else if (lastNote.templateType === 'initial_assessment') {
        // Après une évaluation initiale, suggérer une session standard
        suggestedTemplateType = 'standard';
      } else {
        // Session standard par défaut
        suggestedTemplateType = 'standard';
      }
    }
    
    // Trouver le template suggéré
    const suggestedTemplate = await NoteTemplate.findOne({
      $or: [
        { type: suggestedTemplateType, createdBy: psychologistId, isDefault: true },
        { type: suggestedTemplateType, isGlobal: true }
      ]
    }).sort({ isGlobal: -1 });
    
    if (!suggestedTemplate) {
      return res.status(404).json({ message: 'No suitable template found' });
    }
    
    res.status(200).json({
      suggestedTemplate,
      caseHistory: {
        notesCount: existingNotes.length,
        lastNoteDate: existingNotes.length > 0 ? existingNotes[0].createdAt : null,
        templateType: suggestedTemplateType
      }
    });
  } catch (error) {
    console.error('Error getting suggested template:', error);
    res.status(500).json({
      message: 'Error retrieving suggested template',
      error: error.message
    });
  }
});

// POST create a new template - UNCHANGED
router.post('/templates', psychologistAuth, async (req, res) => {
  try {
    const { name, type, structure, isDefault } = req.body;
    const psychologistId = req.user._id || req.user.userId;
    
    // Check if template name already exists for this psychologist
    const existingTemplate = await NoteTemplate.findOne({
      name,
      createdBy: psychologistId
    });
    
    if (existingTemplate) {
      return res.status(400).json({ message: 'Template with this name already exists' });
    }
    
    const newTemplate = new NoteTemplate({
      name,
      type,
      structure,
      createdBy: psychologistId,
      isDefault: isDefault || false,
      isGlobal: false // Custom templates are not global
    });
    
    const savedTemplate = await newTemplate.save();
    
    res.status(201).json({
      message: 'Template created successfully',
      template: savedTemplate
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      message: 'Error creating template',
      error: error.message
    });
  }
});

// POST create a new session note - ENHANCED
router.post('/', psychologistAuth, async (req, res) => {
  try {
    const {
      caseId,
      appointmentId,
      studentId,
      templateType,
      title,
      objectives,
      observations,
      assessments,
      treatment,
      actions,
      followUpPlan,
      privateNotes,
      status
    } = req.body;

    const psychologistId = req.user._id || req.user.userId;

    // Validate that case exists
    const caseExists = await Case.findById(caseId);
    if (!caseExists) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Check if psychologist is authorized for this case
    if (caseExists.psychologistId && caseExists.psychologistId.toString) {
      if (caseExists.psychologistId.toString() !== psychologistId.toString()) {
        return res.status(403).json({ message: 'Not authorized for this case' });
      }
    } else if (caseExists.psychologistId) {
      if (caseExists.psychologistId !== psychologistId) {
        return res.status(403).json({ message: 'Not authorized for this case' });
      }
    }
    
    // Validate against template structure
    const template = await NoteTemplate.findOne({
      $or: [
        { type: templateType, isGlobal: true },
        { type: templateType, createdBy: psychologistId }
      ]
    }).sort({ isGlobal: -1 }); // Priorité aux templates personnalisés
    
    if (template) {
      const missingFields = [];
      
      Object.entries(template.structure).forEach(([field, config]) => {
        if (config.required && (req.body[field] === undefined || req.body[field] === '')) {
          missingFields.push({ field, label: config.label });
        }
      });
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Missing required fields according to selected template',
          missingFields
        });
      }
    }

    // Create new session note
    const newNote = new SessionNote({
      caseId,
      appointmentId,
      psychologistId,
      studentId,
      templateType: templateType || 'standard',
      title,
      objectives,
      observations,
      assessments,
      treatment,
      actions,
      followUpPlan,
      privateNotes,
      status: status || 'draft'
    });

    const savedNote = await newNote.save();

    // Add note reference to the case
    await Case.findByIdAndUpdate(caseId, {
      $push: { sessionNotes: savedNote._id }
    });
    
    // Retourner la note créée sans populate pour éviter les erreurs
    res.status(201).json({
      message: 'Session note created successfully',
      note: savedNote
    });
  } catch (error) {
    console.error('Error creating session note:', error);
    res.status(500).json({
      message: 'Error creating session note',
      error: error.message
    });
  }
});

// GET a specific session note by ID - UNCHANGED
router.get('/:id', psychologistAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    
    // Vérification préliminaire
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid note ID format' });
    }
    
    // Check access permission
    const { hasAccess, error, note } = await checkAccess(psychologistId, id);
    if (!hasAccess) {
      return res.status(403).json({ message: error });
    }
    
    // Au lieu de faire une nouvelle requête, utilisons la note déjà récupérée par checkAccess
    // et populons simplement ce qui est nécessaire
    const populatedNote = await SessionNote.findById(id)
      .populate('caseId')
      .populate('appointmentId');

    if (!populatedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    // Contournement pour éviter les erreurs de modèle non enregistré
    const response = {
      ...populatedNote.toObject(),
      psychologistId: note.psychologistId,
      studentId: note.studentId
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting session note:', error);
    res.status(500).json({
      message: 'Error retrieving session note',
      error: error.message
    });
  }
});

// PUT update an existing session note - ENHANCED
router.put('/:id', psychologistAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid note ID format' });
    }
    
    // Vérifier l'accès à la note
    const note = await SessionNote.findOne({
      _id: id,
      psychologistId: psychologistId,
      isDeleted: { $ne: true }
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found or unauthorized access' });
    }
    
    const updates = req.body;
    
    // Si le status change de 'draft' à 'completed', valider les champs requis
    if (note.status === 'draft' && updates.status === 'completed') {
      const template = await NoteTemplate.findOne({
        $or: [
          { type: note.templateType, isGlobal: true },
          { type: note.templateType, createdBy: psychologistId }
        ]
      }).sort({ isGlobal: -1 });
      
      if (template) {
        const missingFields = [];
        
        // Combiner les données existantes avec les mises à jour
        const combinedData = { ...note.toObject(), ...updates };
        
        Object.entries(template.structure).forEach(([field, config]) => {
          if (config.required && (!combinedData[field] || combinedData[field] === '')) {
            missingFields.push({ field, label: config.label });
          }
        });
        
        if (missingFields.length > 0) {
          return res.status(400).json({
            message: 'Cannot complete note with missing required fields',
            missingFields
          });
        }
      }
    }
    
    // Only allow updating specific fields
    const allowedUpdates = [
      'title', 'objectives', 'observations', 
      'assessments', 'treatment', 'actions', 
      'followUpPlan', 'privateNotes', 'status'
    ];
    
    const updateData = {};
    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    
    // Mettre à jour la note
    note.set(updateData);
    const updatedNote = await note.save();
    
    // Mettre à jour le dernier contact si la note passe au statut "completed"
    if (updates.status === 'completed' && note.status !== 'completed') {
      await Case.findByIdAndUpdate(note.caseId, {
        lastContact: new Date()
      });
    }
    
    res.status(200).json({
      message: 'Session note updated successfully',
      note: updatedNote
    });
  } catch (error) {
    console.error('Error updating session note:', error);
    res.status(500).json({
      message: 'Error updating session note',
      error: error.message
    });
  }
});

// GET all session notes for a specific case - UNCHANGED
router.get('/case/:caseId', psychologistAuth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    
    // Check if case exists and belongs to this psychologist
    const caseData = await Case.findOne({
      _id: caseId,
      psychologistId: psychologistId
    });
    
    if (!caseData) {
      return res.status(404).json({ message: 'Case not found or unauthorized access' });
    }
    
    const sessionNotes = await SessionNote.find({
      caseId,
      psychologistId,
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: -1 });
    
    res.status(200).json(sessionNotes);
  } catch (error) {
    console.error('Error getting session notes by case:', error);
    res.status(500).json({
      message: 'Error retrieving session notes',
      error: error.message
    });
  }
});

// DELETE (soft delete) a session note - UNCHANGED
router.delete('/:id', psychologistAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    
    // Check access permission
    const { hasAccess, error } = await checkAccess(psychologistId, id);
    if (!hasAccess) {
      return res.status(403).json({ message: error });
    }
    
    // Soft delete by setting isDeleted flag
    await SessionNote.findByIdAndUpdate(id, { isDeleted: true });
    
    res.status(200).json({ message: 'Session note deleted successfully' });
  } catch (error) {
    console.error('Error deleting session note:', error);
    res.status(500).json({
      message: 'Error deleting session note',
      error: error.message
    });
  }
});

// Initialize default templates function - UNCHANGED
const initializeDefaultTemplates = async () => {
  try {
    // Check if default templates already exist
    const templatesCount = await NoteTemplate.countDocuments({ isGlobal: true });
    if (templatesCount > 0) {
      console.log('Default templates already exist');
      return;
    }

    console.log('Creating default note templates...');

    const defaultTemplates = [
      {
        name: 'Standard Session',
        type: 'standard',
        structure: {
          objectives: {
            label: 'Session Objectives',
            placeholder: 'What were the goals for this session?',
            required: true,
            defaultValue: ''
          },
          observations: {
            label: 'Observations',
            placeholder: 'What did you observe during the session?',
            required: true,
            defaultValue: ''
          },
          assessments: {
            label: 'Assessments',
            placeholder: 'Any assessments conducted or results discussed?',
            required: false,
            defaultValue: ''
          },
          treatment: {
            label: 'Treatment Approaches',
            placeholder: 'What therapeutic approaches were used?',
            required: false,
            defaultValue: ''
          },
          actions: {
            label: 'Recommended Actions',
            placeholder: 'What actions were recommended to the student?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Follow-up Plan',
            placeholder: 'What is the plan for the next session?',
            required: false,
            defaultValue: ''
          }
        },
        isDefault: true,
        isGlobal: true
      },
      {
        name: 'Initial Assessment',
        type: 'initial_assessment',
        structure: {
          objectives: {
            label: 'Assessment Goals',
            placeholder: 'What is the purpose of this initial assessment?',
            required: true,
            defaultValue: 'To assess the student\'s mental health needs and establish a baseline for treatment.'
          },
          observations: {
            label: 'Client History & Present Concerns',
            placeholder: 'Document the client\'s history and current presenting issues',
            required: true,
            defaultValue: ''
          },
          assessments: {
            label: 'Assessment Tools Used',
            placeholder: 'What assessment tools or questionnaires were administered?',
            required: true,
            defaultValue: ''
          },
          treatment: {
            label: 'Proposed Treatment Plan',
            placeholder: 'What is the initial treatment plan?',
            required: true,
            defaultValue: ''
          },
          actions: {
            label: 'Immediate Recommendations',
            placeholder: 'What immediate actions or recommendations were provided?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Follow-up Schedule',
            placeholder: 'What is the recommended follow-up schedule?',
            required: true,
            defaultValue: ''
          }
        },
        isDefault: true,
        isGlobal: true
      },
      {
        name: 'Crisis Intervention',
        type: 'crisis_intervention',
        structure: {
          objectives: {
            label: 'Crisis Description',
            placeholder: 'Describe the nature of the crisis',
            required: true,
            defaultValue: ''
          },
          observations: {
            label: 'Risk Assessment',
            placeholder: 'Document the risk assessment conducted',
            required: true,
            defaultValue: 'Safety assessment conducted. Risk level:'
          },
          assessments: {
            label: 'Current Mental State',
            placeholder: 'Document the client\'s current mental state',
            required: true,
            defaultValue: ''
          },
          treatment: {
            label: 'Intervention Details',
            placeholder: 'What crisis intervention techniques were used?',
            required: true,
            defaultValue: ''
          },
          actions: {
            label: 'Safety Planning',
            placeholder: 'What safety planning was implemented?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Follow-up Protocol',
            placeholder: 'What is the crisis follow-up protocol?',
            required: true,
            defaultValue: 'Follow-up scheduled within 24-48 hours.'
          }
        },
        isDefault: true,
        isGlobal: true
      },
      {
        name: 'Progress Update',
        type: 'progress_update',
        structure: {
          objectives: {
            label: 'Progress Review Goals',
            placeholder: 'What aspects of progress are being reviewed?',
            required: true,
            defaultValue: 'To evaluate progress toward treatment goals and adjust plan if needed.'
          },
          observations: {
            label: 'Progress Since Last Session',
            placeholder: 'What progress has been made since the last session?',
            required: true,
            defaultValue: ''
          },
          assessments: {
            label: 'Updated Assessment',
            placeholder: 'Any new assessment results or changes in scores?',
            required: false,
            defaultValue: ''
          },
          treatment: {
            label: 'Treatment Plan Adjustments',
            placeholder: 'What adjustments are needed to the treatment plan?',
            required: true,
            defaultValue: ''
          },
          actions: {
            label: 'New Recommended Actions',
            placeholder: 'What new actions are recommended?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Next Steps',
            placeholder: 'What are the next steps in treatment?',
            required: true,
            defaultValue: ''
          }
        },
        isDefault: true,
        isGlobal: true
      },// Follow-up Session template
      {
        name: 'Follow-up Session',
        type: 'follow_up',
        structure: {
          objectives: {
            label: 'Follow-up Objectives',
            placeholder: 'What are the specific goals of this follow-up session?',
            required: true,
            defaultValue: 'To assess progress on recommendations and treatment plan from previous sessions.'
          },
          observations: {
            label: 'Status Update',
            placeholder: 'What changes have occurred since the last session?',
            required: true,
            defaultValue: ''
          },
          assessments: {
            label: 'Progress Evaluation',
            placeholder: 'How is the student progressing towards treatment goals?',
            required: true,
            defaultValue: ''
          },
          treatment: {
            label: 'Treatment Adjustments',
            placeholder: 'What adjustments to the treatment approach are necessary?',
            required: false,
            defaultValue: ''
          },
          actions: {
            label: 'Next Actions',
            placeholder: 'What are the next steps for the student?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Continuing Care Plan',
            placeholder: 'What is the ongoing care plan?',
            required: true,
            defaultValue: 'Next follow-up scheduled in [X] weeks.'
          }
        },
        isDefault: true,
        isGlobal: true
      }
    ];

    await NoteTemplate.insertMany(defaultTemplates);
    console.log('Default templates created successfully');
  } catch (error) {
    console.error('Error initializing default templates:', error);
  }
};

// Export the initialization function to be called when server starts
module.exports.initializeDefaultTemplates = initializeDefaultTemplates;
module.exports.router = router;