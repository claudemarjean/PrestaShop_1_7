<?php
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

declare(strict_types=1);

namespace PrestaShop\PrestaShop\Adapter\File\Uploader;

use PrestaShop\PrestaShop\Adapter\File\Validator\VirtualProductFileValidator;
use PrestaShop\PrestaShop\Core\File\Exception\FileUploadException;
use ProductDownload;

/**
 * Uploads file for virtual product
 */
class VirtualProductFileUploader
{
    /**
     * @var VirtualProductFileValidator
     */
    private $virtualProductFileValidator;

    /**
     * @param VirtualProductFileValidator $virtualProductFileValidator
     */
    public function __construct(
        VirtualProductFileValidator $virtualProductFileValidator
    ) {
        $this->virtualProductFileValidator = $virtualProductFileValidator;
    }

    /**
     * @param string file to upload $filePath
     *
     * @return string uploaded file path
     */
    public function upload(string $filePath): string
    {
        $this->virtualProductFileValidator->validate($filePath);

        $destination = _PS_DOWNLOAD_DIR_ . ProductDownload::getNewFilename();

        //@todo: doesnt delete the source file
        //  in handler scope we cannot ensure that provided path is tmp folder.
        //  however it introduces issue that file copy will remain in system unless its deleted by gc
        //  or we don't care and simply use `rename` instead?
        //  same applies to images https://github.com/PrestaShop/PrestaShop/pull/21510#discussion_r519169510
        if (!copy($filePath, $destination)) {
            throw new FileUploadException(sprintf(
                'Failed to copy file from "%s" to "%s"', $filePath, $destination
            ));
        }

        return $destination;
    }
}
