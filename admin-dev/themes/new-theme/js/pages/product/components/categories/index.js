/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */

import ProductMap from '@pages/product/product-map';
import {getCategories} from '@pages/product/services/categories';
import Bloodhound from 'typeahead.js';
import AutoCompleteSearch from '@components/auto-complete-search';

const {$} = window;

const ProductCategoryMap = ProductMap.categories;

export default class CategoriesManager {
  constructor() {
    this.categoriesContainer = document.querySelector(
      ProductCategoryMap.categoriesContainer,
    );
    this.categories = [];
    this.typeaheadDatas = [];
    this.categoryTree = this.categoriesContainer.querySelector(ProductCategoryMap.categoryTree);
    this.prototypeTemplate = this.categoryTree.dataset.prototype;
    this.prototypeName = this.categoryTree.dataset.prototypeName;
    this.expandAllButton = this.categoriesContainer.querySelector(ProductCategoryMap.expandAllButton);
    this.reduceAllButton = this.categoriesContainer.querySelector(ProductCategoryMap.reduceAllButton);

    this.initCategories();

    return {};
  }

  async initCategories() {
    this.categories = await getCategories();

    // This regexp is gonna be used to get id from checkbox name
    let regexpString = ProductCategoryMap.checkboxName('__REGEXP__');
    regexpString = regexpString.replaceAll('[', '\\[');
    regexpString = regexpString.replaceAll(']', '\\]');
    regexpString = regexpString.replace('__REGEXP__', '([0-9]+)');
    this.categoryIdRegexp = new RegExp(regexpString);

    this.initTypeaheadData(this.categories, '');
    this.initTypeahead();
    this.initTree();
    this.updateCategoriesTags();
  }

  initTree() {
    const initialElements = {};

    this.categoryTree.querySelectorAll(ProductCategoryMap.treeElement).forEach((treeElement) => {
      const checkboxInput = treeElement.querySelector(ProductCategoryMap.checkboxInput);
      const categoryId = this.getIdFromCheckbox(checkboxInput);
      initialElements[categoryId] = treeElement;
    });

    this.categories.forEach((category) => {
      const item = this.generateCategoryTree(category, initialElements);
      this.categoryTree.append(item);
    });

    this.expandAllButton.addEventListener('click', () => {
      this.toggleAll(true);
    });
    this.reduceAllButton.addEventListener('click', () => {
      this.toggleAll(false);
    });

    this.categoryTree.querySelectorAll(ProductCategoryMap.checkboxInput).forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this.updateCategoriesTags();
      });
    });

    // Tree is initialized we can show it and hide loader
    this.categoriesContainer
      .querySelector(ProductCategoryMap.fieldset)
      .classList.remove('d-none');
    this.categoriesContainer
      .querySelector(ProductCategoryMap.loader)
      .classList.add('d-none');
  }

  /**
   * Used to recursively create items of the category tree
   *
   * @param {Object} category
   * @param {Object} initialElements
   */
  generateCategoryTree(category, initialElements) {
    const categoryNode = this.generateTreeElement(category, initialElements);
    const childrenList = categoryNode.querySelector(ProductCategoryMap.childrenList);
    childrenList.classList.add('d-none');

    const hasChildren = category.children && category.children.length > 0;
    categoryNode.classList.toggle('more', hasChildren);
    if (hasChildren) {
      const inputsContainer = categoryNode.querySelector(ProductCategoryMap.treeElementInputs);
      inputsContainer.addEventListener('click', (event) => {
        // We don't want to mess with the inputs behaviour (no toggle when checkbox or radio is clicked)
        // So we only toggle when the div itself is clicked.
        if (event.target !== event.currentTarget) {
          return;
        }

        const isExpanded = !childrenList.classList.contains('d-none');
        categoryNode.classList.toggle('less', !isExpanded);
        categoryNode.classList.toggle('more', isExpanded);
        childrenList.classList.toggle('d-none', isExpanded);
      });

      // Recursively build the children trees
      category.children.forEach((childCategory) => {
        const childTree = this.generateCategoryTree(childCategory, initialElements);

        childrenList.append(childTree);
      });
    }

    return categoryNode;
  }

  /**
   * If the category is among the initial ones (inserted by the form on load) the existing element is used,
   * if not then it is generated based on the prototype template. In both case the element is injected with the
   * category name and click on radio is handled.
   *
   * @param {Object} category
   * @param {Object} initialElements
   *
   * @returns {HTMLElement}
   */
  generateTreeElement(category, initialElements) {
    let categoryNode;

    if (!Object.prototype.hasOwnProperty.call(initialElements, category.id)) {
      const template = this.prototypeTemplate.replace(new RegExp(this.prototypeName, 'g'), category.id);
      // Trim is important here or the first child could be some text (whitespace, or \n)
      const frag = document.createRange().createContextualFragment(template.trim());
      categoryNode = frag.firstChild;
    } else {
      categoryNode = initialElements[category.id];
    }

    // Add category name as a text between the checkbox and the radio
    const radioInput = categoryNode.querySelector(ProductCategoryMap.radioInput);
    radioInput.parentNode.insertBefore(
      document.createTextNode(category.name),
      radioInput,
    );
    radioInput.addEventListener('click', () => {
      this.selectedDefaultCategory(radioInput);
    });
    if (radioInput.checked) {
      this.lockDefaultCheckbox(radioInput);
    }

    return categoryNode;
  }

  /**
   * @param {HTMLElement} radioInput
   */
  selectedDefaultCategory(radioInput) {
    // Uncheck all other radio inputs when one is selected
    this.categoryTree.querySelectorAll(ProductCategoryMap.radioInput).forEach((radioTreeElement) => {
      if (radioTreeElement !== radioInput) {
        radioTreeElement.checked = false;
      }
    });

    // All checkboxes are enabled (only the one associated with the default will be disabled)
    this.categoryTree.querySelectorAll(ProductCategoryMap.checkboxInput).forEach((checkboxTreeElement) => {
      checkboxTreeElement.disabled = false;
    });
    this.lockDefaultCheckbox(radioInput);
  }

  /**
   * @param {HTMLElement} radioInput
   */
  lockDefaultCheckbox(radioInput) {
    // If the element is selected as default it is also associated by definition
    const parentItem = radioInput.parentNode.closest(ProductCategoryMap.treeElement);
    const checkbox = parentItem.querySelector(ProductCategoryMap.checkboxInput);

    // A default category is necessarily associated
    checkbox.checked = true;
    checkbox.disabled = true;
  }

  /**
   * Expand/reduce the category tree
   *
   * @param {boolean} expanded Force expanding instead of toggle
   */
  toggleAll(expanded) {
    this.expandAllButton.style.display = expanded ? 'none' : 'block';
    this.reduceAllButton.style.display = !expanded ? 'none' : 'block';

    this.categoriesContainer
      .querySelectorAll(ProductCategoryMap.childrenList)
      .forEach((e) => {
        e.classList.toggle('d-none', !expanded);
      });

    this.categoriesContainer
      .querySelectorAll(ProductCategoryMap.everyItems)
      .forEach((e) => {
        e.classList.toggle('more', !expanded);
        e.classList.toggle('less', expanded);
      });
  }

  /**
   * Check the selected category (matched by its ID) and toggle the tree by going up through the category's ancestors.
   *
   * @param {int} categoryId
   */
  selectCategory(categoryId) {
    const checkbox = this.categoriesContainer.querySelector(
      `[name="${ProductCategoryMap.checkboxName(categoryId)}"]`,
    );

    if (!checkbox) {
      return;
    }
    checkbox.checked = true;

    // This is the element containing the checkbox
    let parentItem = checkbox.closest(ProductCategoryMap.treeElement);

    if (parentItem !== null) {
      // This is the first (potential) parent element
      parentItem = parentItem.parentNode.closest(ProductCategoryMap.treeElement);
    }

    while (parentItem !== null && this.categoryTree.contains(parentItem)) {
      const childrenList = parentItem.querySelector(ProductCategoryMap.childrenList);

      if (childrenList.childNodes.length) {
        parentItem.classList.add('less');
        parentItem.classList.remove('more');
        parentItem.querySelector(ProductCategoryMap.childrenList).classList.remove('d-none');
      }

      parentItem = parentItem.parentNode.closest(ProductCategoryMap.treeElement);
    }
  }

  /**
   * Typeahead data require to have only one array level, we also build the breadcrumb as we go through the
   * categories.
   */
  initTypeaheadData(data, parentBreadcrumb) {
    data.forEach((category) => {
      category.breadcrumb = parentBreadcrumb ? `${parentBreadcrumb} > ${category.name}` : category.name;
      this.typeaheadDatas.push(category);

      if (category.children) {
        this.initTypeaheadData(category.children, category.breadcrumb);
      }
    });
  }

  initTypeahead() {
    const source = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace(
        'name',
        'value',
      ),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: this.typeaheadDatas,
    });

    const dataSetConfig = {
      source,
      display: 'breadcrumb',
      value: 'id',
      onSelect: (selectedItem, e, $searchInput) => {
        this.selectCategory(selectedItem.id);

        // This resets the search input or else previous search is cached and can be added again
        $searchInput.typeahead('val', '');
      },
      onClose: (event, $searchInput) => {
        // This resets the search input or else previous search is cached and can be added again
        $searchInput.typeahead('val', '');
        return true;
      },
    };

    dataSetConfig.templates = {
      suggestion: (item) => `<div class="px-2">${item.breadcrumb}</div>`,
    };

    new AutoCompleteSearch($(ProductCategoryMap.searchInput), dataSetConfig);
  }

  updateCategoriesTags() {
    const checkedCheckboxes = this.categoryTree.querySelectorAll(ProductCategoryMap.checkedCheckboxInputs);
    const tagsContainer = this.categoriesContainer.querySelector(ProductCategoryMap.tagsContainer);
    tagsContainer.innerHTML = '';

    checkedCheckboxes.forEach((checkboxInput) => {
      const categoryId = this.getIdFromCheckbox(checkboxInput);
      const category = this.getCategoryById(categoryId);

      if (!category) {
        return;
      }
      const template = `
        <span class="pstaggerTag">
            <span data-id="${category.id}" title="${category.breadcrumb}">${category.name}</span>
            <a class="pstaggerClosingCross" href="#" data-id="${category.id}">x</a>
        </span>
      `;

      // Trim is important here or the first child could be some text (whitespace, or \n)
      const frag = document.createRange().createContextualFragment(template.trim());
      tagsContainer.append(frag.firstChild);
    });

    tagsContainer.querySelectorAll('.pstaggerClosingCross').forEach((closeLink) => {
      closeLink.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const categoryId = event.currentTarget.dataset.id;
        const checkbox = this.categoriesContainer.querySelector(
          `[name="${ProductCategoryMap.checkboxName(categoryId)}"]`,
        );

        if (!checkbox) {
          return;
        }
        checkbox.checked = false;
        this.updateCategoriesTags();
      });
    });

    tagsContainer.classList.toggle('d-block', checkedCheckboxes.length > 0);
  }

  /**
   * @param {int} categoryId
   *
   * @returns {Object|null}
   */
  getCategoryById(categoryId) {
    return this.searchCategory(categoryId, this.categories);
  }

  /**
   * @param {int} categoryId
   * @param {array} categories
   * @returns {Object|null}
   */
  searchCategory(categoryId, categories) {
    let searchedCategory = null;
    categories.forEach((category) => {
      if (categoryId === category.id) {
        searchedCategory = category;
      }

      if (searchedCategory === null && category.children && category.children.length > 0) {
        searchedCategory = this.searchCategory(categoryId, category.children);
      }
    });

    return searchedCategory;
  }

  /**
   * @param {HTMLElement} checkboxInput
   *
   * @returns {number}
   */
  getIdFromCheckbox(checkboxInput) {
    const matches = checkboxInput.name.match(this.categoryIdRegexp);

    return Number(matches[1]);
  }
}
