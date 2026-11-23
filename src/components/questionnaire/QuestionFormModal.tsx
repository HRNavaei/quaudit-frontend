import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Divider,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, BranchesOutlined } from '@ant-design/icons';
import { Question, QuestionOption, QuestionType } from '../../types';
import { getEligibleFollowUpTargets, getChainQuestionIds } from '../../utils/conditionalLogic';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Text } = Typography;

interface QuestionFormModalProps {
  visible: boolean;
  question?: Question | null;
  existingQuestions: Question[];
  onCancel: () => void;
  onSave: (question: Partial<Question>) => void;
  title?: string;
}

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  visible,
  question,
  existingQuestions,
  onCancel,
  onSave,
  title,
}) => {
  const isMobile = useIsMobile();
  const [form] = Form.useForm();
  const selectedType = Form.useWatch('type', form);

  useEffect(() => {
    if (visible) {
      if (question) {
        form.setFieldsValue({
          text: question.text,
          type: question.type,
          isRequired: question.isRequired ?? true,
          options: question.options && question.options.length > 0
            ? question.options.map((o) => ({
                id: o.id,
                label: o.label,
                value: o.value,
                followUpQuestionId: o.followUpQuestionId || undefined,
              }))
            : getDefaultOptions(question.type),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: 'TEXT',
          isRequired: true,
          options: [],
        });
      }
    }
  }, [visible, question, form]);

  const generateOptionId = () => `opt-${Math.random().toString(36).substring(2, 9)}`;

  const getDefaultOptions = (type?: QuestionType) => {
    if (type === 'YES_NO') {
      return [
        { id: generateOptionId(), label: 'Yes', value: 'yes' },
        { id: generateOptionId(), label: 'No', value: 'no' },
      ];
    }
    if (type === 'SINGLE_CHOICE') {
      return [
        { id: generateOptionId(), label: 'Option 1', value: 'opt1' },
        { id: generateOptionId(), label: 'Option 2', value: 'opt2' },
      ];
    }
    return [];
  };

  const handleTypeChange = (type: QuestionType) => {
    if (type === 'YES_NO') {
      form.setFieldsValue({
        options: [
          { id: generateOptionId(), label: 'Yes', value: 'yes' },
          { id: generateOptionId(), label: 'No', value: 'no' },
        ],
      });
    } else if (type === 'SINGLE_CHOICE') {
      form.setFieldsValue({
        options: [
          { id: generateOptionId(), label: 'Option 1', value: 'opt1' },
          { id: generateOptionId(), label: 'Option 2', value: 'opt2' },
        ],
      });
    } else {
      form.setFieldsValue({ options: [] });
    }
  };

  // Find questions that can be safely targeted as follow-ups without creating cycles
  const eligibleTargets = getEligibleFollowUpTargets(
    question?.id || 'new-question',
    existingQuestions
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updatedQuestion: Partial<Question> = {
        id: question?.id,
        text: values.text,
        type: values.type,
        isRequired: values.isRequired,
        options: (values.options || []).map((opt: Partial<QuestionOption>, idx: number) => ({
          id: opt.id || generateOptionId(),
          label: opt.label || '',
          value: opt.value || opt.label?.toLowerCase() || '',
          order: idx + 1,
          followUpQuestionId: opt.followUpQuestionId || null,
        })),
      };
      onSave(updatedQuestion);
    } catch {
      // Form validation error
    }
  };

  return (
    <Modal
      title={title || (question ? 'Edit Question' : 'Add Question')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={isMobile ? 'calc(100vw - 20px)' : 680}
      style={{ top: isMobile ? 16 : undefined }}
      destroyOnClose
      okText={question ? 'Update Question' : 'Add Question'}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="text"
          label="Question Text"
          rules={[{ required: true, message: 'Please enter question text' }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="e.g. Does your facility possess valid ISO 9001 certification?"
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="type"
            label="Question Type"
            rules={[{ required: true, message: 'Please select a type' }]}
          >
            <Select onChange={handleTypeChange}>
              <Select.Option value="TEXT">Text (Free response)</Select.Option>
              <Select.Option value="YES_NO">Yes / No</Select.Option>
              <Select.Option value="SINGLE_CHOICE">Single Choice</Select.Option>
              <Select.Option value="NUMBER">Number (Numeric rating or count)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isRequired"
            label="Requirement"
            valuePropName="checked"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
              <Switch defaultChecked />
              <Text type="secondary">Mandatory to answer</Text>
            </div>
          </Form.Item>
        </div>

        {/* Options configuration for YES_NO and SINGLE_CHOICE */}
        {(selectedType === 'YES_NO' || selectedType === 'SINGLE_CHOICE') && (
          <div>
            <Divider orientation="left" style={{ margin: '16px 0 12px' }}>
              <Space>
                <span>Choice Options & Follow-up Branching</span>
                <BranchesOutlined style={{ color: '#1677ff' }} />
              </Space>
            </Divider>

            <Form.List name="options">
              {(fields, { add, remove }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <div
                      key={key}
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto',
                          gap: 12,
                          alignItems: isMobile ? 'stretch' : 'center',
                        }}
                      >
                        <Form.Item
                          {...restField}
                          name={[name, 'label']}
                          label="Option Label"
                          rules={[{ required: true, message: 'Required' }]}
                          style={{ margin: 0 }}
                        >
                          <Input placeholder="e.g. Yes" />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'followUpQuestionId']}
                          label={
                            <Space size={4}>
                              <BranchesOutlined style={{ color: '#1677ff' }} />
                              <span>Reveal Question</span>
                            </Space>
                          }
                          style={{ margin: 0 }}
                        >
                          <Select
                            placeholder="None (no follow-up)"
                            allowClear
                            options={eligibleTargets.map((q) => ({
                              value: q.id,
                              label: `Q: ${q.text.substring(0, 45)}${q.text.length > 45 ? '...' : ''}`,
                            }))}
                          />
                        </Form.Item>

                        {selectedType === 'SINGLE_CHOICE' && fields.length > 2 && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              const currentOpt = form.getFieldValue(['options', name]);
                              if (currentOpt?.followUpQuestionId) {
                                const chainIds = getChainQuestionIds(currentOpt.followUpQuestionId, existingQuestions);
                                const count = chainIds.length;
                                const title = count === 1 ? 'Delete Follow-up Question?' : 'Delete Follow-up Questions?';
                                const content =
                                  count === 1
                                    ? 'This option has 1 follow-up question. Deleting it will permanently remove that follow-up question from the questionnaire. Are you sure you want to proceed?'
                                    : `This option has ${count} follow-up questions. Deleting it will permanently remove those ${count} follow-up questions from the questionnaire. Are you sure you want to proceed?`;
                                const okText = count === 1 ? 'Delete Follow-up Question' : `Delete All ${count} Follow-up Questions`;

                                Modal.confirm({
                                  title,
                                  content,
                                  okText,
                                  okType: 'danger',
                                  onOk: () => remove(name),
                                });
                              } else {
                                remove(name);
                              }
                            }}
                            style={{ marginTop: 24 }}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {selectedType === 'SINGLE_CHOICE' && (
                    <Button
                      type="dashed"
                      onClick={() => add({ id: generateOptionId(), label: `Option ${fields.length + 1}`, value: `opt_${fields.length + 1}` })}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add Option
                    </Button>
                  )}
                </div>
              )}
            </Form.List>
          </div>
        )}
      </Form>
    </Modal>
  );
};
