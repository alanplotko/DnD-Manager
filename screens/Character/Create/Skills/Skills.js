import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { Container, Content } from 'native-base';
import { Button, COLOR, Icon, IconToggle, ListItem, Toolbar }
  from 'react-native-material-ui';
import Note from 'FifthEditionManager/components/Note';
import { BASE_SKILLS, BACKGROUNDS, CLASSES } from 'FifthEditionManager/config/Info';
import { CardStyle, ContainerStyle } from 'FifthEditionManager/stylesheets';
import {
  toTitleCase,
  calculateProficiencyBonus,
  reformatCamelCaseKey,
} from 'FifthEditionManager/util';
import { cloneDeep } from 'lodash';

// Styles
const checkIconStyle = { opacity: 0.5, paddingHorizontal: 12 };

export default class Skills extends React.Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      const props = {
        leftElement: 'arrow-back',
        onLeftElementPress: () => navigation.goBack(),
        centerElement: 'Set Skills',
      };
      return <Toolbar {...props} />;
    },
  }

  static propTypes = {
    navigation: PropTypes.object.isRequired,
  }

  static contextTypes = {
    uiTheme: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      skills: cloneDeep(BASE_SKILLS),
      isProficiencyNoteCollapsed: true,
      isBackgroundNoteCollapsed: true,
      isClassNoteCollapsed: true,
      ...props.navigation.state.params,
    };

    // Set character proficiency
    this.state.character.profile.proficiency =
      calculateProficiencyBonus(this.state.character.profile.level);

    // Track given proficiencies
    this.state.proficiencies = {
      background: BACKGROUNDS
        .find(option => option.key === this.state.character.profile.background.lookupKey)
        .proficiencies.skills,
      baseClass: CLASSES
        .find(option => option.key === this.state.character.profile.baseClass.lookupKey)
        .proficiencies.skills,
    };

    // Define proficiency options
    this.state.proficiencies.options =
      [...this.state.proficiencies.baseClass.options]
        .filter(skill => !this.state.proficiencies.background.includes(skill));
    // Track number of proficiency replacements the user will need to select
    this.state.proficiencies.extras =
      [...this.state.proficiencies.baseClass.options]
        .filter(skill => this.state.proficiencies.background.includes(skill))
        .length;
    // Keep original number of extras with original quantity in base class
    this.state.proficiencies.baseClass.extras = this.state.proficiencies.extras;
    // Track number of proficiencies that the user must select from the options
    this.state.proficiencies.quantity =
      this.state.proficiencies.baseClass.quantity;

    // Set up base skills with default proficiencies
    this.state.skills = this.setBaseSkills(this.state.skills);
  }

  setSkills = () => {
    const { navigate, state } = this.props.navigation;
    state.params.character.lastUpdated = Date.now();
    state.params.character.profile.skills = cloneDeep(this.state.skills);
    navigate('AssignLanguages', { ...state.params });
  }

  setBaseSkills = (copy) => {
    const skills = cloneDeep(copy);
    Object.entries(skills).forEach((skill) => {
      skills[skill[0]].modifier =
        this.state.character.profile.stats[skill[1].ability].modifier;
      skills[skill[0]].proficient = this.state.proficiencies.background
        .includes(skill[0]);
      if (skills[skill[0]].proficient) {
        skills[skill[0]].modifier += this.state.character.profile.proficiency;
      }
    });
    return skills;
  }

  resetSkills = () => {
    let skills = cloneDeep(BASE_SKILLS);
    const proficiencies = cloneDeep(this.state.proficiencies);
    proficiencies.quantity = this.state.proficiencies.baseClass.quantity;
    proficiencies.extras = this.state.proficiencies.baseClass.extras;
    skills = this.setBaseSkills(skills);
    this.setState({ skills, proficiencies });
  }

  toggleProficient = (key) => {
    const skills = cloneDeep(this.state.skills);
    const proficiencies = cloneDeep(this.state.proficiencies);

    // Toggle proficiency in skill
    skills[key].proficient = !skills[key].proficient;

    const change = (skills[key].proficient ? 1 : -1);

    // Add or subtract proficiency and quantity appropriately after toggle
    skills[key].modifier += (this.state.character.profile.proficiency * change);
    proficiencies.quantity -= change;
    const skillName = reformatCamelCaseKey(key);
    if (!proficiencies.options.includes(skillName)) {
      proficiencies.extras -= change;
    }

    this.setState({ skills, proficiencies });
  }

  toggleProficiencyNote = () => {
    this.setState({
      isProficiencyNoteCollapsed: !this.state.isProficiencyNoteCollapsed,
    });
  }

  toggleBackgroundNote = () => {
    this.setState({
      isBackgroundNoteCollapsed: !this.state.isBackgroundNoteCollapsed,
    });
  }

  toggleClassNote = () => {
    this.setState({
      isClassNoteCollapsed: !this.state.isClassNoteCollapsed,
    });
  }


  render() {
    // Theme setup
    const { textColor } = this.context.uiTheme.palette;
    const textStyle = { color: textColor };

    const ListItemRow = (key, skill) => {
      const skillName = reformatCamelCaseKey(key);
      const negative = skill.modifier < 0;
      const checkedTextColor = negative ? COLOR.red500 : COLOR.green500;
      const modifier = Math.abs(skill.modifier);
      return (
        <ListItem
          key={key}
          divider
          centerElement={
            <View style={styles.horizontalLayout}>
              <Text style={[styles.smallHeading, textStyle]}>
                {skill.skillLabel} ({toTitleCase(skill.ability.substr(0, 3))})
              </Text>
              <Text
                style={[
                  styles.smallHeading,
                  CardStyle.makeBold,
                  { color: skill.proficient ? textColor : checkedTextColor },
                ]}
              >
                {
                  !skill.proficient && negative &&
                  <Text>&minus;{modifier}</Text>
                }
                {
                  !skill.proficient && !negative &&
                  <Text>+{modifier}</Text>
                }
                {
                  skill.proficient &&
                  <Text>
                    {modifier - this.state.character.profile.proficiency}
                    &nbsp;+&nbsp;
                    {this.state.character.profile.proficiency} =&nbsp;
                    <Text style={{ color: checkedTextColor }}>
                      {modifier >= 0 ? <Text>+</Text> : <Text>&minus;</Text>}
                      {modifier}
                    </Text>
                  </Text>
                }
              </Text>
            </View>
          }
          rightElement={
            this.state.proficiencies.background.includes(skillName) ?
              <Icon
                name="check-circle"
                color={COLOR.green500}
                style={checkIconStyle}
              /> :
              <IconToggle
                name="check-circle"
                color={skill.proficient ? COLOR.green500 : COLOR.grey600}
                percent={75}
                onPress={() => this.toggleProficient(key)}
                disabled={
                  !skill.proficient &&
                  (
                    this.state.proficiencies.quantity === 0 ||
                    (
                      !this.state.proficiencies.options.includes(skillName) &&
                      this.state.proficiencies.extras === 0
                    )
                  )
                }
              />
          }
        />
      );
    };
    const hasChanged = Object.keys(this.state.skills)
      .filter(key => this.state.skills[key].proficient)
      .length > this.state.proficiencies.background.length;

    return (
      <Container style={ContainerStyle.parent}>
        <Content>
          <View style={styles.containerMargin}>
            <Note
              title="Calculating Proficiency Bonus"
              type="info"
              icon="info"
              collapsible
              isCollapsed={this.state.isProficiencyNoteCollapsed}
              toggleNoteHandler={this.toggleProficiencyNote}
              uiTheme={this.context.uiTheme}
            >
              <Text style={styles.textMargin}>
                The proficiency bonus is derived from your level. At
                <Text style={CardStyle.makeBold}>
                  &nbsp;level {this.state.character.profile.level}
                </Text>
                ,&nbsp;your proficiency bonus is
                <Text style={CardStyle.makeBold}>
                  &nbsp;+{this.state.character.profile.proficiency}
                </Text>
                . A shortcut to determine the proficiency bonus is
                dividing your level by 4, rounding up, and adding 1.{'\n\n'}
                ceil({this.state.character.profile.level} / 4) + 1 =&nbsp;
                {Math.ceil(this.state.character.profile.level / 4)} + 1 =&nbsp;
                <Text style={CardStyle.makeBold}>
                  +{this.state.character.profile.proficiency}
                </Text>
                .
              </Text>
            </Note>
            <Note
              title={`${this.state.character.profile.background.name} Proficiencies`}
              type="info"
              icon="info"
              collapsible
              isCollapsed={this.state.isBackgroundNoteCollapsed}
              toggleNoteHandler={this.toggleBackgroundNote}
              uiTheme={this.context.uiTheme}
            >
              <Text style={styles.textMargin}>
                The
                <Text style={CardStyle.makeBold}>
                  &nbsp;{this.state.character.profile.background.name}&nbsp;
                </Text>
                background grants the following proficiencies and will be
                set automatically:{'\n\n'}
              </Text>
              {this.state.proficiencies.background.map(key => (
                <Text key={`${key}-background-list`}>
                  &emsp;&bull;&nbsp;{toTitleCase(key)}{'\n'}
                </Text>
              ))}
            </Note>
            <Note
              title={`${this.state.character.profile.baseClass.name} Proficiencies`}
              type="info"
              icon="info"
              collapsible
              isCollapsed={this.state.isClassNoteCollapsed}
              toggleNoteHandler={this.toggleClassNote}
              uiTheme={this.context.uiTheme}
            >
              <Text style={styles.textMargin}>
                The
                <Text style={CardStyle.makeBold}>
                  &nbsp;{this.state.character.profile.baseClass.name}&nbsp;
                </Text>
                class grants
                <Text style={CardStyle.makeBold}>
                  &nbsp;{this.state.proficiencies.baseClass.quantity}&nbsp;
                </Text>
                proficiencies from the list below
                {
                  this.state.proficiencies.baseClass.extras === 0 &&
                  <Text>
                  :
                  </Text>
                }
                {
                  this.state.proficiencies.baseClass.extras > 0 &&
                  <Text>
                    ,
                    <Text style={CardStyle.makeBold}>
                      &nbsp;{this.state.proficiencies.baseClass.extras}&nbsp;
                    </Text>
                    of which&nbsp;
                    {
                      this.state.proficiencies.baseClass.extras > 1 ?
                        'are' :
                        'is'
                    }
                    &nbsp;accounted for with your
                    <Text style={CardStyle.makeBold}>
                      &nbsp;{this.state.character.profile.background.name}&nbsp;
                    </Text>
                    background. As such, of the
                    <Text style={CardStyle.makeBold}>
                      &nbsp;{this.state.proficiencies.baseClass.quantity}&nbsp;
                    </Text>
                    {
                      this.state.proficiencies.baseClass.quantity > 1 ?
                        'proficiencies' :
                        'proficiency'
                    }
                    &nbsp;to select,
                    <Text style={CardStyle.makeBold}>
                      &nbsp;{this.state.proficiencies.baseClass.extras}&nbsp;
                    </Text>
                    {
                      this.state.proficiencies.baseClass.extras > 1 ?
                        'proficiencies' :
                        'proficiency'
                    }
                    &nbsp;may come from outside the below list:
                  </Text>
                }
                {'\n\n'}
              </Text>
              {this.state.proficiencies.options.map(key => (
                <Text key={`${key}-option-list`}>
                  &emsp;&bull;&nbsp;{toTitleCase(key)}{'\n'}
                </Text>
              ))}
            </Note>
            <View style={styles.buttonLayout}>
              <Button
                accent
                raised
                disabled={!hasChanged}
                onPress={() => this.resetSkills()}
                text="Reset"
                style={{
                  container: {
                    flex: 1,
                    marginRight: 5,
                    marginTop: 10,
                    marginBottom: 20,
                  },
                }}
              />
              <Button
                primary
                raised
                disabled={this.state.proficiencies.quantity > 0}
                onPress={() => this.setSkills()}
                text={
                  this.state.proficiencies.quantity > 0 ?
                    `${this.state.proficiencies.quantity} Skills Remaining` :
                    'Proceed'
                }
                style={{
                  container: {
                    flex: 2,
                    marginLeft: 5,
                    marginTop: 10,
                    marginBottom: 20,
                  },
                }}
              />
            </View>
            <ListItem
              divider
              centerElement={
                <View style={styles.horizontalLayout}>
                  <Text style={[styles.smallHeading, textStyle]}>Skill</Text>
                  <Text style={[styles.smallHeading, textStyle]}>
                    Modifier / Is Proficient
                  </Text>
                </View>
              }
            />
            {
              Object.entries(this.state.skills)
                .map(skill => ListItemRow(skill[0], skill[1]))
            }
          </View>
        </Content>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  containerMargin: {
    margin: 20,
  },
  textMargin: {
    marginBottom: 10,
  },
  horizontalLayout: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallHeading: {
    fontFamily: 'RobotoLight',
    color: COLOR.black,
    fontSize: 18,
  },
  buttonLayout: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});